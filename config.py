"""
Configuration file for the Multi-Agent Medical Chatbot

Supports any OpenAI-compatible API via .env variables.
Default: DashScope (阿里云百炼). Switch by changing LLM_BASE_URL / LLM_API_KEY.
"""

import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

load_dotenv()

# ---- 通过 .env 切换 LLM 提供商 ----
# 用 or 而不是 os.getenv default，因为空字符串也应该用默认值
LLM_BASE_URL = os.getenv("LLM_BASE_URL") or "https://dashscope.aliyuncs.com/compatible-mode/v1"
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("DASHSCOPE_API_KEY") or ""

if not LLM_API_KEY:
    raise RuntimeError(
        "LLM_API_KEY 未设置！请在 .env 中填入你的 API Key。\n"
        "  DashScope: https://dashscope.console.aliyun.com/apiKey\n"
        "  OpenAI:    https://platform.openai.com/api-keys\n"
    )
# embedding 可以独立配置，默认跟随 LLM
EMBEDDING_BASE_URL = os.getenv("EMBEDDING_BASE_URL") or LLM_BASE_URL
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY") or LLM_API_KEY


def _create_llm(temperature=0.3):
    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "qwen-plus"),
        openai_api_key=LLM_API_KEY,
        openai_api_base=LLM_BASE_URL,
        temperature=temperature,
    )


def _create_vision_llm(temperature=0.1):
    return ChatOpenAI(
        model=os.getenv("VISION_MODEL", "qwen-vl-plus"),
        openai_api_key=LLM_API_KEY,
        openai_api_base=LLM_BASE_URL,
        temperature=temperature,
    )


def _create_embeddings():
    return OpenAIEmbeddings(
        model=os.getenv("EMBEDDING_MODEL", "text-embedding-v3"),
        openai_api_key=EMBEDDING_API_KEY,
        openai_api_base=EMBEDDING_BASE_URL,
    )


class AgentDecisionConfig:
    def __init__(self):
        self.llm = _create_llm(temperature=0.1)


class ConversationConfig:
    def __init__(self):
        self.llm = _create_llm(temperature=0.7)


class WebSearchConfig:
    def __init__(self):
        self.llm = _create_llm(temperature=0.3)
        self.context_limit = 20


class RAGConfig:
    def __init__(self):
        self.vector_db_type = "qdrant"
        self.embedding_dim = 1024  # text-embedding-v3 默认维度
        self.distance_metric = "Cosine"
        self.use_local = True
        self.vector_local_path = "./data/qdrant_db"
        self.doc_local_path = "./data/docs_db"
        self.parsed_content_dir = "./data/parsed_docs"
        self.url = os.getenv("QDRANT_URL")
        self.api_key = os.getenv("QDRANT_API_KEY")
        self.collection_name = "medical_assistance_rag"
        self.chunk_size = 512
        self.chunk_overlap = 50
        self.embedding_model = _create_embeddings()
        self.llm = _create_llm(temperature=0.3)
        self.summarizer_model = _create_llm(temperature=0.5)
        self.chunker_model = _create_llm(temperature=0.0)
        self.response_generator_model = _create_llm(temperature=0.3)
        self.top_k = 5
        self.vector_search_type = "similarity"
        self.huggingface_token = os.getenv("HUGGINGFACE_TOKEN")
        self.reranker_model = "cross-encoder/ms-marco-TinyBERT-L-6"
        self.reranker_top_k = 3
        self.max_context_length = 8192
        self.include_sources = True
        self.min_retrieval_confidence = 0.40
        self.context_limit = 20


class MedicalCVConfig:
    def __init__(self):
        self.brain_tumor_model_path = "./agents/image_analysis_agent/brain_tumor_agent/models/brain_tumor_segmentation.pth"
        self.chest_xray_model_path = "./agents/image_analysis_agent/chest_xray_agent/models/covid_chest_xray_model.pth"
        self.skin_lesion_model_path = "./agents/image_analysis_agent/skin_lesion_agent/models/checkpointN25_.pth.tar"
        self.skin_lesion_segmentation_output_path = "./uploads/skin_lesion_output/segmentation_plot.png"
        self.llm = _create_vision_llm(temperature=0.1)


class SpeechConfig:
    def __init__(self):
        self.eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY")
        self.eleven_labs_voice_id = "21m00Tcm4TlvDq8ikWAM"


class ValidationConfig:
    def __init__(self):
        self.require_validation = {
            "CONVERSATION_AGENT": False,
            "RAG_AGENT": False,
            "WEB_SEARCH_AGENT": False,
            "BRAIN_TUMOR_AGENT": True,
            "CHEST_XRAY_AGENT": True,
            "SKIN_LESION_AGENT": True
        }
        self.validation_timeout = 300
        self.default_action = "reject"


class APIConfig:
    def __init__(self):
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", "8080"))
        self.debug = True
        self.rate_limit = 10
        self.max_image_upload_size = 5


class UIConfig:
    def __init__(self):
        self.theme = "light"
        self.enable_speech = True
        self.enable_image_upload = True


class Config:
    def __init__(self):
        self.agent_decision = AgentDecisionConfig()
        self.conversation = ConversationConfig()
        self.rag = RAGConfig()
        self.medical_cv = MedicalCVConfig()
        self.web_search = WebSearchConfig()
        self.api = APIConfig()
        self.speech = SpeechConfig()
        self.validation = ValidationConfig()
        self.ui = UIConfig()
        self.eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY")
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.max_conversation_history = 20
        self.checkpoint_db_path = os.getenv("CHECKPOINT_DB_PATH", "./data/checkpoints.db")
