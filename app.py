import os
import json
import uuid
import sqlite3
import tempfile
from datetime import datetime, timezone
from typing import Dict, Union, Optional, List
import glob
import threading
import time
from io import BytesIO

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request, Response, Cookie
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel

import uvicorn
import requests
from werkzeug.utils import secure_filename
from pydub import AudioSegment
from elevenlabs.client import ElevenLabs

from config import Config
from agents.agent_decision import process_query, process_query_stream
from logging_config import setup_logging
import health_db

logger = setup_logging(__name__)

# Load configuration
config = Config()

# Initialize FastAPI app
app = FastAPI(title="Multi-Agent Medical Chatbot", version="2.0")

# Set up directories
UPLOAD_FOLDER = "uploads/backend"
FRONTEND_UPLOAD_FOLDER = "uploads/frontend"
SKIN_LESION_OUTPUT = "uploads/skin_lesion_output"
SPEECH_DIR = "uploads/speech"

# Create directories if they don't exist
for directory in [UPLOAD_FOLDER, FRONTEND_UPLOAD_FOLDER, SKIN_LESION_OUTPUT, SPEECH_DIR]:
    os.makedirs(directory, exist_ok=True)

# Mount static files directory
app.mount("/data", StaticFiles(directory="data"), name="data")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# Initialize ElevenLabs client
client = ElevenLabs(
    api_key=config.speech.eleven_labs_api_key,
)

# Define allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    """Check if file has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_old_audio():
    """Deletes all .mp3 files in the uploads/speech folder every 5 minutes."""
    while True:
        try:
            files = glob.glob(f"{SPEECH_DIR}/*.mp3")
            for file in files:
                os.remove(file)
            logger.debug("Cleaned up old speech files.")
        except Exception as e:
            logger.error("Error during cleanup: %s", e)
        time.sleep(300)  # Runs every 5 minutes

# Start background cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_audio, daemon=True)
cleanup_thread.start()

class QueryRequest(BaseModel):
    query: str
    conversation_history: List = []
    thread_id: Optional[str] = None

class SpeechRequest(BaseModel):
    text: str
    voice_id: str = "EXAMPLE_VOICE_ID"  # Default voice ID


@app.get("/health")
def health_check():
    """Health check endpoint for Docker health checks"""
    return {"status": "healthy"}

@app.post("/chat")
def chat(
    request: QueryRequest, 
    response: Response, 
    session_id: Optional[str] = Cookie(None)
):
    """Process user text query through the multi-agent system."""
    # Generate session ID for cookie if it doesn't exist
    if not session_id:
        session_id = str(uuid.uuid4())
    
    try:
        thread_id = request.thread_id or session_id
        response_data = process_query(request.query, thread_id=thread_id)
        response_text = response_data['messages'][-1].content

        # Set session cookie
        response.set_cookie(key="session_id", value=session_id)

        # Check if the agent is skin lesion segmentation and find the image path
        result = {
            "status": "success",
            "response": response_text, 
            "agent": response_data["agent_name"]
        }
        
        # If it's the skin lesion segmentation agent, check for output image
        if response_data["agent_name"] == "SKIN_LESION_AGENT, HUMAN_VALIDATION":
            segmentation_path = os.path.join(SKIN_LESION_OUTPUT, "segmentation_plot.png")
            if os.path.exists(segmentation_path):
                result["result_image"] = f"/uploads/skin_lesion_output/segmentation_plot.png?v={int(time.time())}"
            else:
                logger.warning("Skin Lesion Output path does not exist.")

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(
    request: QueryRequest,
    response: Response,
    session_id: Optional[str] = Cookie(None),
):
    """Process user query and stream the response via SSE."""
    if not session_id:
        session_id = str(uuid.uuid4())

    async def event_generator():
        agent_name = "UNKNOWN"
        thread_id = request.thread_id or session_id
        try:
            async for event_type, data in process_query_stream(request.query, thread_id=thread_id):
                if event_type == "token":
                    yield f"data: {json.dumps({'type': 'token', 'content': data}, ensure_ascii=False)}\n\n"
                elif event_type == "agent":
                    agent_name = data
                    yield f"data: {json.dumps({'type': 'agent', 'name': data}, ensure_ascii=False)}\n\n"
                elif event_type == "done":
                    yield f"data: {json.dumps({'type': 'done', 'agent': agent_name}, ensure_ascii=False)}\n\n"
                elif event_type == "error":
                    yield f"data: {json.dumps({'type': 'error', 'message': data}, ensure_ascii=False)}\n\n"
                    return
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    resp = StreamingResponse(event_generator(), media_type="text/event-stream")
    resp.set_cookie(key="session_id", value=session_id)
    return resp


@app.post("/upload")
async def upload_image(
    request: Request,
    response: Response,
    image: UploadFile = File(...),
    text: str = Form(""),
    session_id: Optional[str] = Cookie(None)
):
    """Process medical image uploads with optional text input."""
    # Validate file type
    if not allowed_file(image.filename):
        return JSONResponse(
            status_code=400, 
            content={
                "status": "error",
                "agent": "System",
                "response": "Unsupported file type. Allowed formats: PNG, JPG, JPEG"
            }
        )
    
    # Check file size before saving
    file_content = await image.read()
    if len(file_content) > config.api.max_image_upload_size * 1024 * 1024:  # Convert MB to bytes
        return JSONResponse(
            status_code=413, 
            content={
                "status": "error",
                "agent": "System",
                "response": f"File too large. Maximum size allowed: {config.api.max_image_upload_size}MB"
            }
        )
    
    # Generate session ID for cookie if it doesn't exist
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Save file securely
    filename = secure_filename(f"{uuid.uuid4()}_{image.filename}")
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    try:
        thread_id = request.headers.get("X-Thread-Id") or session_id
        query = {"text": text, "image": file_path}
        response_data = process_query(query, thread_id=thread_id)
        response_text = response_data['messages'][-1].content

        # Set session cookie
        response.set_cookie(key="session_id", value=session_id)

        # Check if the agent is skin lesion segmentation and find the image path
        result = {
            "status": "success",
            "response": response_text, 
            "agent": response_data["agent_name"]
        }
        
        # If it's the skin lesion segmentation agent, check for output image
        if response_data["agent_name"] == "SKIN_LESION_AGENT, HUMAN_VALIDATION":
            segmentation_path = os.path.join(SKIN_LESION_OUTPUT, "segmentation_plot.png")
            if os.path.exists(segmentation_path):
                result["result_image"] = f"/uploads/skin_lesion_output/segmentation_plot.png?v={int(time.time())}"
            else:
                logger.warning("Skin Lesion Output path does not exist.")

        # Remove temporary file after sending
        try:
            os.remove(file_path)
        except Exception as e:
            logger.error("Failed to remove temporary file: %s", e)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history")
def get_history(session_id: str):
    """Load conversation history for a given session from checkpoint DB."""
    try:
        db_path = config.checkpoint_db_path
        if not os.path.exists(db_path):
            return {"session_id": session_id, "messages": []}

        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT checkpoint, metadata FROM checkpoints "
            "WHERE thread_id = ? ORDER BY checkpoint_id DESC LIMIT 1",
            (session_id,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return {"session_id": session_id, "messages": []}

        import pickle
        checkpoint = pickle.loads(row["checkpoint"])
        channel_values = checkpoint.get("channel_values", {})
        messages = channel_values.get("messages", [])

        result = []
        for msg in messages:
            role = "user" if msg.__class__.__name__ == "HumanMessage" else "assistant"
            content = getattr(msg, "content", "")
            ts = getattr(msg, "additional_kwargs", {}).get("timestamp", "")
            result.append({"role": role, "content": content, "agent": "", "timestamp": ts})

        return {"session_id": session_id, "messages": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/history")
def delete_history(session_id: str):
    """Delete conversation history for a given session."""
    try:
        db_path = config.checkpoint_db_path
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            conn.execute("DELETE FROM checkpoints WHERE thread_id = ?", (session_id,))
            conn.commit()
            conn.close()
        return {"status": "deleted", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/validate")
def validate_medical_output(
    response: Response,
    validation_result: str = Form(...), 
    comments: Optional[str] = Form(None),
    session_id: Optional[str] = Cookie(None)
):
    """Handle human validation for medical AI outputs."""
    # Generate session ID for cookie if it doesn't exist
    if not session_id:
        session_id = str(uuid.uuid4())

    try:
        # Set session cookie
        response.set_cookie(key="session_id", value=session_id)
        
        # Re-run the agent decision system with the validation input
        validation_query = f"Validation result: {validation_result}"
        if comments:
            validation_query += f" Comments: {comments}"
        
        response_data = process_query(validation_query)

        if validation_result.lower() == 'yes':
            return {
                "status": "validated",
                "message": "**Output confirmed by human validator:**",
                "response": response_data['messages'][-1].content
            }
        else:
            return {
                "status": "rejected",
                "comments": comments,
                "message": "**Output requires further review:**",
                "response": response_data['messages'][-1].content
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Endpoint to transcribe speech using ElevenLabs API"""
    if not audio.filename:
        return JSONResponse(
            status_code=400,
            content={"error": "No audio file selected"}
        )
    
    try:
        # Save the audio file temporarily
        os.makedirs(SPEECH_DIR, exist_ok=True)
        temp_audio = f"./{SPEECH_DIR}/speech_{uuid.uuid4()}.webm"
        
        # Read and save the file
        audio_content = await audio.read()
        with open(temp_audio, "wb") as f:
            f.write(audio_content)
        
        # Debug: Print file size to check if it's empty
        file_size = os.path.getsize(temp_audio)
        logger.debug("Received audio file size: %d bytes", file_size)
        
        if file_size == 0:
            return JSONResponse(
                status_code=400,
                content={"error": "Received empty audio file"}
            )
        
        # Convert to MP3
        mp3_path = f"./{SPEECH_DIR}/speech_{uuid.uuid4()}.mp3"
        
        try:
            # Use pydub with format detection
            audio = AudioSegment.from_file(temp_audio)
            audio.export(mp3_path, format="mp3")
            
            # Debug: Print MP3 file size
            mp3_size = os.path.getsize(mp3_path)
            logger.debug("Converted MP3 file size: %d bytes", mp3_size)

            with open(mp3_path, "rb") as mp3_file:
                audio_data = mp3_file.read()
            logger.debug("Converted audio file into byte array successfully!")

            transcription = client.speech_to_text.convert(
                file=audio_data,
                model_id="scribe_v1",
                tag_audio_events=True,
                language_code="eng",
                diarize=True,
            )
            
            # Clean up temp files
            try:
                os.remove(temp_audio)
                os.remove(mp3_path)
                logger.debug("Deleted temp files: %s, %s", temp_audio, mp3_path)
            except Exception as e:
                logger.warning("Could not delete file: %s", e)
            
            if transcription.text:
                return {"transcript": transcription.text}
            else:
                return JSONResponse(
                    status_code=500,
                    content={"error": f"API error: {transcription}", "details": transcription.text}
                )

        except Exception as e:
            logger.error("Error processing audio: %s", e)
            return JSONResponse(
                status_code=500,
                content={"error": f"Error processing audio: {str(e)}"}
            )
                
    except Exception as e:
        logger.error("Transcription error: %s", e)
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.post("/generate-speech")
async def generate_speech(request: SpeechRequest):
    """Endpoint to generate speech using ElevenLabs API"""
    try:
        text = request.text
        selected_voice_id = request.voice_id
        
        if not text:
            return JSONResponse(
                status_code=400,
                content={"error": "Text is required"}
            )
        
        # Define API request to ElevenLabs
        elevenlabs_url = f"https://api.elevenlabs.io/v1/text-to-speech/{selected_voice_id}/stream"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": config.speech.eleven_labs_api_key
        }
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }

        # Send request to ElevenLabs API
        response = requests.post(elevenlabs_url, headers=headers, json=payload)

        if response.status_code != 200:
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to generate speech, status: {response.status_code}", "details": response.text}
            )
        
        # Save the audio file temporarily
        os.makedirs(SPEECH_DIR, exist_ok=True)
        temp_audio_path = f"./{SPEECH_DIR}/{uuid.uuid4()}.mp3"
        with open(temp_audio_path, "wb") as f:
            f.write(response.content)

        # Return the generated audio file
        return FileResponse(
            path=temp_audio_path,
            media_type="audio/mpeg",
            filename="generated_speech.mp3"
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# Add exception handler for request entity too large
@app.exception_handler(413)
async def request_entity_too_large(request, exc):
    return JSONResponse(
        status_code=413,
        content={
            "status": "error",
            "agent": "System",
            "response": f"File too large. Maximum size allowed: {config.api.max_image_upload_size}MB"
        }
    )

# ─── Personal Health Record API ────────────────────────────────

class HealthProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    conditions: Optional[List[str]] = None
    medications: Optional[List[dict]] = None
    allergies: Optional[List[str]] = None
    surgeries: Optional[List[str]] = None
    notes: Optional[str] = None


class HealthLogEntry(BaseModel):
    log_type: str
    value: dict
    note: str = ""


@app.get("/health/profile/{profile_id}")
def api_get_profile(profile_id: str):
    return health_db.get_or_create_profile(profile_id)


@app.put("/health/profile/{profile_id}")
def api_update_profile(profile_id: str, data: HealthProfileUpdate):
    return health_db.update_profile(profile_id, data.model_dump(exclude_none=True))


@app.post("/health/logs/{profile_id}")
def api_add_log(profile_id: str, entry: HealthLogEntry):
    return health_db.add_log(entry.log_type, entry.value, entry.note, profile_id=profile_id)


@app.get("/health/logs")
def api_get_logs(log_type: Optional[str] = None, limit: int = 30):
    return health_db.get_logs(log_type, limit)


@app.get("/health/summary/{profile_id}")
def api_get_summary(profile_id: str):
    return health_db.get_summary(profile_id)


# mounted last so API routes take precedence
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="spa")

if __name__ == "__main__":
    uvicorn.run(app, host=config.api.host, port=config.api.port)