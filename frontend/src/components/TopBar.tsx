import { ChevronLeft, Clock, Bell, ShoppingCart, Search } from "./icons";

export default function TopBar() {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-muted hover:bg-primary-light hover:text-primary card-shadow">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Hello, William 👋</h1>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 card-shadow">
              <Clock className="h-3 w-3 text-primary" /> 5:30 PM
            </span>
            <span className="hidden sm:inline">Here's your wellness snapshot for today.</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 card-shadow md:flex">
          <Search className="h-4 w-4 text-muted" />
          <input
            placeholder="Search health data..."
            className="w-48 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>
        <button className="relative flex h-11 items-center gap-2 rounded-2xl bg-white px-3 card-shadow">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-ink">Checked in</span>
          <span className="text-xs text-muted">12h</span>
        </button>
        <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-muted hover:text-primary card-shadow">
          <ShoppingCart className="h-4 w-4" />
        </button>
        <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-muted hover:text-primary card-shadow">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            2
          </span>
        </button>
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-light to-primary text-sm font-bold text-primary ring-2 ring-white card-shadow">
          WM
        </div>
      </div>
    </div>
  );
}
