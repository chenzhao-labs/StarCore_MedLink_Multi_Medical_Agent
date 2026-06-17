import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import AIAssistant from "./components/AIAssistant";
import Placeholder from "./components/Placeholder";
import ChatPage from "./components/ChatPage";
import { Sparkles } from "./components/icons";

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [showAI, setShowAI] = useState(true);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gradient-to-br from-[#eef4fb] via-[#f6f9ff] to-[#eef4fb]">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[#7cb9ff]/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#f472b6]/4 blur-3xl" />
      </div>

      {/* Fixed Header */}
      <header className="relative z-30 shrink-0">
        <Header />
      </header>

      {/* Three-column body / immersive for chat */}
      <main className="relative z-10 flex min-h-0 flex-1 gap-4 p-4 lg:gap-5 lg:p-5">
        {active === "chat" ? (
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-white/60 backdrop-blur-xl card-shadow">
            <ChatPage onNavigate={() => setActive("dashboard")} />
          </section>
        ) : (
          <>
            <Sidebar active={active} onSelect={setActive} />

            <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-white/60 backdrop-blur-xl card-shadow">
              <div className="scrollbar-thin flex-1 overflow-y-auto p-5 lg:p-6">
                {active === "dashboard" ? <Dashboard /> : <Placeholder page={active} />}
              </div>
            </section>

            {showAI ? (
              <AIAssistant onClose={() => setShowAI(false)} />
            ) : (
              <button
                onClick={() => setShowAI(true)}
                className="flex h-full shrink-0 flex-col items-center justify-center gap-2 rounded-[28px] bg-white/60 px-3 backdrop-blur-xl card-shadow hover:bg-white/80 xl:w-[52px]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-[0_4px_12px_-4px_rgba(43,136,248,0.5)]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold text-muted">AI</span>
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
