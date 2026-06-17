import { useState, useEffect } from "react";
import { Clock, Bell, Search } from "./icons";

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Header() {
  const [time, setTime] = useState(getTime);

  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white/80 px-6 backdrop-blur-xl">
      {/* Left: Logo + Greeting + Time */}
      <div className="flex items-center gap-3 shrink-0">
        <img src="/logo.png" alt="Medlink" className="h-18 w-18" />
        <span className="text-xl font-bold text-ink tracking-tight">MedLink</span>
        <div className="ml-14">
          <span className="text-xl font-bold text-ink">Hello, Chen</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-ink">
          <Clock className="h-3 w-3 text-primary" />{time}
        </span>
      </div>

      {/* Middle: Search */}
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center px-2">
        <div className="flex w-full items-center gap-2 rounded-full border border-border bg-soft/60 px-4 py-2 focus-within:border-primary focus-within:bg-white focus-within:shadow-sm transition-all">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            placeholder="Search health data..."
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md bg-white/70 px-1.5 text-[10px] font-medium text-muted border border-border">
            ⌘K
          </kbd>
        </div>
      </div>
      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-ink transition-colors" title="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-tight text-white">
            2
          </span>
        </button>

        <div className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl cursor-pointer ring-2 ring-white shadow-sm hover:shadow-md transition-shadow" title="Your account">
          <img src="/user.jpg" alt="User" className="h-full w-full object-cover" />
        </div>
      </div>
    </header>
  );
}
