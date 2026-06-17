const BASE = "";

export async function* streamChat(query: string, threadId: string, signal?: AbortSignal) {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, thread_id: threadId }),
    signal,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch { /* skip partial */ }
      }
    }
  }
}

export async function uploadImage(file: File, text: string, threadId: string) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("text", text);
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: { "X-Thread-Id": threadId },
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload error: ${res.status}`);
  return res.json();
}

export async function transcribeAudio(audioBlob: Blob) {
  const fd = new FormData();
  fd.append("audio", audioBlob, "speech.webm");
  const res = await fetch(`${BASE}/transcribe`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`Transcribe error: ${res.status}`);
  const data = await res.json();
  return data.transcript || data.error || "";
}

// ─── Health Profile ─────────────────────────────────────────

const PROFILE_ID = "default";

export async function getProfile() {
  const res = await fetch(`${BASE}/health/profile/${PROFILE_ID}`);
  if (!res.ok) throw new Error(`Profile error: ${res.status}`);
  return res.json();
}

export async function updateProfile(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/health/profile/${PROFILE_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Profile update: ${res.status}`);
  return res.json();
}

export async function addHealthLog(logType: string, value: Record<string, unknown>, note = "") {
  const res = await fetch(`${BASE}/health/logs/${PROFILE_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ log_type: logType, value, note }),
  });
  if (!res.ok) throw new Error(`Log error: ${res.status}`);
  return res.json();
}

export async function getHealthLogs(logType?: string, limit = 30) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (logType) params.set("log_type", logType);
  const res = await fetch(`${BASE}/health/logs?${params}`);
  if (!res.ok) throw new Error(`Logs error: ${res.status}`);
  return res.json();
}

export async function getHealthSummary() {
  const res = await fetch(`${BASE}/health/summary/${PROFILE_ID}`);
  if (!res.ok) throw new Error(`Summary error: ${res.status}`);
  return res.json();
}

export async function generateSpeech(text: string) {
  const res = await fetch(`${BASE}/generate-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Speech error: ${res.status}`);
  return res.blob();
}
