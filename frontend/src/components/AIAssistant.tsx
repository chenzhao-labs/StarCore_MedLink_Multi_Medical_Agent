import { useState } from "react";
import { MessageCircle, Video, Mic, Send, Paperclip } from "./icons";

type Msg = { role: "user" | "ai"; text: string; time: string };

const suggestions = ["Today's To-Do", "My health condition", "Assigned plan"];

export default function AIAssistant({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<"chat" | "video">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { role: "user", text: input, time: t }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: "Thanks for sharing — I've adjusted today's wellness plan. Your hydration target is now 2.4L and I've scheduled a gentle 15-min walk at 5 PM. Keep up the great work!",
          time: t,
        },
      ]);
    }, 700);
  };

  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-[28px] bg-white/80 backdrop-blur-xl card-shadow lg:w-[280px]">
      {/* Header: Title + Tab Toggle */}
      <div className="shrink-0 px-4 pt-4 pb-1 border-b border-border/40">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-ink">AI Assistant</h3>
          <div className="flex items-center gap-1.5">
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-ink transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-0.5 rounded-xl bg-soft/80 p-0.5">
              <button
                onClick={() => setTab("chat")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                  tab === "chat" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-primary hover:bg-white/60"
                }`}
              >
                <MessageCircle className="h-3 w-3" /> Chat
              </button>
              <button
                onClick={() => setTab("video")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                  tab === "video" ? "bg-ink text-white shadow-sm" : "text-muted hover:text-ink hover:bg-white/60"
                }`}
              >
                <Video className="h-3 w-3" /> Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="scrollbar-thin flex min-h-0 flex-col flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar */}
        <div>
          <div className="mt-4 text-center">
            <h4 className="text-lg font-bold text-ink">Med</h4>
            <p className="text-xs text-muted">Your Personal Health Assistant</p>
            <img
              src="/ai-assistant.png"
              alt="AI Assistant"
              className="mx-auto mt-3 w-[240px]"
            />
          </div>
        </div>

        {/* Chat Messages */}
        <div className="space-y-2.5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed transition-shadow ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary-dark text-white shadow-[0_4px_12px_-4px_rgba(43,136,248,0.45)]"
                    : "bg-soft/70 text-ink"
                }`}
              >
                {m.text}
                <div className={`mt-1.5 text-[10px] font-medium ${m.role === "user" ? "text-white/65" : "text-muted"}`}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="-mx-1">
          <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted/70">Suggestions</div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {suggestions.map((s) => (
              <button
                key={s}
                className="rounded-full border border-border/70 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-ink hover:border-primary hover:text-primary hover:bg-primary-light/40 transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className="shrink-0 border-t border-border/40 p-4 pt-3">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-white p-2 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(43,136,248,0.08)] transition-all">
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-primary transition-colors" title="Attach file">
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask anything about yourself..."
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-primary transition-colors" title="Voice input">
            <Mic className="h-4 w-4" />
          </button>
          <button
            onClick={send}
            disabled={!input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_4px_12px_-4px_rgba(43,136,248,0.55)] hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
