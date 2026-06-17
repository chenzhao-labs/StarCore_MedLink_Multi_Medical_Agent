import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Paperclip, Mic, Trash2, Stethoscope, Plus, MessageCircle, PanelLeftClose, PanelLeft, CircleStop } from "./icons";
import { streamChat, uploadImage, transcribeAudio, getProfile } from "@/api/client";

type Msg = {
  role: "user" | "ai";
  text: string;
  time: string;
  image?: string;
  agent?: string;
  streaming?: boolean;
};

type Convo = {
  id: string;
  threadId: string;
  title: string;
  createdAt: number;
};

function uid() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

const LS_CONVOS = "med_chat_convos";
const LS_MSGS_PREFIX = "med_chat_msgs_";
const MAX_MSGS = 100;

const agentLabel: Record<string, string> = {
  RAG_AGENT: "Literature",
  WEB_SEARCH_AGENT: "Web Search",
  CONVERSATION_AGENT: "General",
  BRAIN_TUMOR_AGENT: "Brain Tumor",
  CHEST_XRAY_AGENT: "Chest X-Ray",
  SKIN_LESION_AGENT: "Skin Lesion",
};

const suggestions = [
  "What are the types and diagnostic methods for brain tumors?",
  "What are the typical chest X-ray findings for COVID-19?",
  "How to determine if a skin lesion is benign or malignant?",
];

function loadConvos(): Convo[] {
  try {
    return JSON.parse(localStorage.getItem(LS_CONVOS) || "[]");
  } catch { return []; }
}

function saveConvos(convos: Convo[]) {
  localStorage.setItem(LS_CONVOS, JSON.stringify(convos));
}

function loadMessages(convoId: string): Msg[] {
  try {
    return JSON.parse(localStorage.getItem(LS_MSGS_PREFIX + convoId) || "[]");
  } catch { return []; }
}

function saveMessages(convoId: string, msgs: Msg[]) {
  const trimmed = msgs.slice(-MAX_MSGS);
  localStorage.setItem(LS_MSGS_PREFIX + convoId, JSON.stringify(trimmed));
}

export default function ChatPage({ onNavigate }: { onNavigate?: () => void }) {
  const [convos, setConvos] = useState<Convo[]>(loadConvos);
  const [activeId, setActiveId] = useState<string>(() => convos[0]?.id || "");
  const [messagesMap, setMessagesMap] = useState<Record<string, Msg[]>>(() => {
    const map: Record<string, Msg[]> = {};
    for (const c of loadConvos()) map[c.id] = loadMessages(c.id);
    return map;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [healthContext, setHealthContext] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeConvo = convos.find((c) => c.id === activeId);
  const messages = activeId ? (messagesMap[activeId] || []) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load health context for injection
  useEffect(() => {
    getProfile().then((p) => {
      const parts: string[] = [];
      if (p?.age) parts.push(`Age ${p.age}`);
      if (p?.gender) parts.push(p.gender);
      if (p?.height) parts.push(`${p.height}cm`);
      if (p?.weight) parts.push(`${p.weight}kg`);
      if (p?.conditions?.length) parts.push(`Conditions: ${p.conditions.join(", ")}`);
      if (p?.medications?.length) parts.push(`Meds: ${p.medications.map((m: any) => m.name || m).join(", ")}`);
      if (p?.allergies?.length) parts.push(`Allergies: ${p.allergies.join(", ")}`);
      if (p?.surgeries?.length) parts.push(`Surgeries: ${p.surgeries.join(", ")}`);
      if (p?.notes) parts.push(`Notes: ${p.notes}`);
      setHealthContext(parts.length ? parts.join(" | ") : "");
    }).catch(() => {});
  }, []);

  // Auto-create first convo if none exist
  useEffect(() => {
    if (convos.length === 0) {
      const c: Convo = { id: uid(), threadId: uid(), title: "New Chat", createdAt: Date.now() };
      setConvos([c]);
      setActiveId(c.id);
    }
  }, [convos.length]);

  // Persist
  useEffect(() => {
    saveConvos(convos);
  }, [convos]);

  useEffect(() => {
    if (activeId && messagesMap[activeId]) {
      saveMessages(activeId, messagesMap[activeId]);
    }
  }, [activeId, messagesMap]);

  const setActiveMessages = useCallback((msgs: Msg[]) => {
    if (!activeId) return;
    setMessagesMap((m) => ({ ...m, [activeId]: msgs }));
  }, [activeId]);

  const addMessage = useCallback((msg: Msg) => {
    if (!activeId) return;
    setMessagesMap((m) => {
      const cur = m[activeId] || [];
      return { ...m, [activeId]: [...cur, msg] };
    });
  }, [activeId]);

  const updateLastAi = useCallback((updater: (msg: Msg) => Msg) => {
    if (!activeId) return;
    setMessagesMap((m) => {
      const cur = m[activeId] || [];
      const idx = cur.length - 1;
      if (idx < 0 || cur[idx].role !== "ai") return m;
      return { ...m, [activeId]: [...cur.slice(0, idx), updater(cur[idx])] };
    });
  }, [activeId]);

  const newChat = () => {
    const c: Convo = { id: uid(), threadId: uid(), title: "New Chat", createdAt: Date.now() };
    setConvos((prev) => [c, ...prev]);
    setActiveId(c.id);
    setError(null);
  };

  const deleteChat = (id: string) => {
    setConvos((prev) => prev.filter((c) => c.id !== id));
    setMessagesMap((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    localStorage.removeItem(LS_MSGS_PREFIX + id);
    if (id === activeId) {
      const remaining = convos.filter((c) => c.id !== id);
      setActiveId(remaining[0]?.id || "");
    }
  };

  const selectChat = (id: string) => {
    setActiveId(id);
    setError(null);
  };

  const sendText = async (text: string) => {
    if (!text.trim() || loading || !activeConvo) return;
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isFirstMsg = messages.length === 0;
    addMessage({ role: "user", text, time: t });
    setInput("");
    setLoading(true);
    setError(null);

    addMessage({ role: "ai", text: "", time: t, streaming: true });

    // Set title from first user message
    if (isFirstMsg) {
      const title = text.length > 40 ? text.slice(0, 40) + "..." : text;
      setConvos((prev) => prev.map((c) => c.id === activeId ? { ...c, title } : c));
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let fullText = "";
      let agentName = "";
      const query = healthContext
        ? `[Patient context: ${healthContext}]\n\nUser query: ${text}`
        : text;
      for await (const evt of streamChat(query, activeConvo.threadId, controller.signal)) {
        if (evt.type === "agent") {
          agentName = evt.name;
          updateLastAi((m) => ({ ...m, agent: agentName }));
        } else if (evt.type === "token") {
          fullText += evt.content;
          updateLastAi((m) => ({ ...m, text: fullText }));
        } else if (evt.type === "done") {
          agentName = evt.agent || agentName;
          updateLastAi((m) => ({ ...m, agent: agentName || undefined, streaming: false }));
        } else if (evt.type === "error") {
          updateLastAi((m) => ({ ...m, text: evt.message, streaming: false }));
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        updateLastAi((m) => ({ ...m, streaming: false }));
      } else {
        updateLastAi((m) => ({ ...m, text: `Error: ${e.message}`, streaming: false }));
        setError(e.message);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  const handleSend = () => sendText(input);

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading || !activeConvo) return;
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const previewUrl = URL.createObjectURL(file);
    const isFirstMsg = messages.length === 0;
    const uploadText = healthContext
      ? `[Patient context: ${healthContext}]\n\nUser query: ${input || "Image uploaded"}`
      : (input || "Image uploaded");
    addMessage({ role: "user", text: uploadText, time: t, image: previewUrl });
    setInput("");
    setLoading(true);
    setError(null);
    addMessage({ role: "ai", text: "", time: t, streaming: true });

    if (isFirstMsg) {
      const title = (input || "Image Analysis").slice(0, 40);
      setConvos((prev) => prev.map((c) => c.id === activeId ? { ...c, title } : c));
    }

    try {
      const data = await uploadImage(file, input, activeConvo.threadId);
      updateLastAi((m) => ({
        ...m,
        text: data.response,
        agent: data.agent,
        image: data.result_image || undefined,
        streaming: false,
      }));
    } catch (e: any) {
      updateLastAi((m) => ({ ...m, text: `Upload failed: ${e.message}`, streaming: false }));
      setError(e.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunks.current = [];
      mr.ondataavailable = (ev) => audioChunks.current.push(ev.data);
      mr.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        try {
          const text = await transcribeAudio(blob);
          setInput((prev) => prev + text);
        } catch { /* ignore */ }
      };
      mr.start();
      setRecording(true);
    } catch { /* mic not available */ }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="flex h-full">
      {/* Conversation Sidebar */}
      <div className={`flex shrink-0 flex-col border-r border-border/40 transition-all ${sidebarOpen ? "w-[220px]" : "w-0 overflow-hidden"}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted/70">Chats</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-5 w-5 items-center justify-center rounded text-muted hover:text-ink transition-colors"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 pb-2">
          <button
            onClick={newChat}
            disabled={loading}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border/60 px-3 py-2 text-[12px] font-medium text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="scrollbar-thin flex-1 overflow-y-auto px-2 space-y-0.5">
          {convos.map((c) => (
            <div
              key={c.id}
              onClick={() => selectChat(c.id)}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-all ${
                c.id === activeId
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-soft text-ink"
              }`}
            >
              <MessageCircle className={`h-3.5 w-3.5 shrink-0 ${c.id === activeId ? "text-primary" : "text-muted"}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium">{c.title}</div>
                <div className="text-[10px] text-muted/60">{formatDate(c.createdAt)}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                className="shrink-0 rounded p-0.5 text-muted/40 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button
                onClick={onNavigate}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink transition-colors"
                title="Back to Dashboard"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink transition-colors"
                title="Show chats"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">AI Consult</h2>
              <p className="text-[11px] text-muted">Multi-Agent Medical AI · Image Analysis · Literature Search</p>
            </div>
          </div>
          <button
            onClick={newChat}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(43,136,248,0.55)] hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="scrollbar-thin flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="mx-auto max-w-lg rounded-2xl bg-red-50 px-4 py-3 text-center text-[13px] text-red-600">{error}</div>
          )}

          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center pt-12">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5">
                <Stethoscope className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-ink">Medical AI Consultation</h3>
              <p className="mb-6 max-w-xl text-[13px] leading-relaxed text-muted">
                I can analyze medical images, search literature, and answer medical questions.
                <br />Supports brain tumor MRI, chest X-ray, and skin lesion analysis.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendText(s)}
                    disabled={loading}
                    className="rounded-full border border-border/70 bg-white/80 px-4 py-2 text-[12px] font-medium text-ink hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary-dark text-white"
                    : "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                }`}
              >
                {m.role === "user" ? "U" : "AI"}
              </div>
              <div className={`max-w-[72%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary-dark text-white"
                      : "bg-white/90 text-ink shadow-sm border border-border/30"
                  }`}
                >
                  {m.image && (
                    <img src={m.image} alt="upload" className="mb-2 w-full max-w-[240px] rounded-lg" />
                  )}
                  {m.streaming && !m.text ? (
                    <span className="inline-flex gap-1.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  )}
                </div>
                <div className={`mt-1 flex items-center gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.agent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {agentLabel[m.agent] || m.agent}
                    </span>
                  )}
                  <span className="text-[10px] text-muted/60">{m.time}</span>
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="shrink-0 border-t border-border/40 px-6 py-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2.5 rounded-2xl border border-border/60 bg-white/90 px-4 py-2.5 shadow-sm focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(43,136,248,0.08)] transition-all">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-primary transition-colors disabled:opacity-40"
              title="Upload medical image"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask a medical question, or upload an image for analysis..."
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-muted/60 focus:outline-none"
              disabled={loading}
            />
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                recording ? "bg-red-50 text-red-500" : "text-muted hover:bg-soft hover:text-primary"
              }`}
              title="Voice input (hold)"
              disabled={loading}
            >
              <Mic className="h-5 w-5" />
            </button>
            {loading ? (
              <button
                onClick={stopGeneration}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-[0_4px_12px_-4px_rgba(239,68,68,0.55)] hover:bg-red-600 active:scale-95 transition-all"
                title="Stop"
              >
                <CircleStop className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_4px_12px_-4px_rgba(43,136,248,0.55)] hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                title="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
