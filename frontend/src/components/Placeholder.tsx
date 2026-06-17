import { ClipboardList, Pill, Users, FlaskConical, Star, Sparkles } from "./icons";

const map: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  care: { title: "Care Plan", subtitle: "Personalized care plans and weekly goals.", icon: ClipboardList, color: "from-primary to-primary-dark" },
  pharmacy: { title: "Pharmacy", subtitle: "Medications, refills and prescription history.", icon: Pill, color: "from-emerald-400 to-emerald-600" },
  community: { title: "Community", subtitle: "Connect with peers, caregivers and groups.", icon: Users, color: "from-violet-400 to-violet-600" },
  trials: { title: "Clinical Trials", subtitle: "Discover nearby trials matching your profile.", icon: FlaskConical, color: "from-pink-400 to-pink-600" },
  subs: { title: "Subscriptions", subtitle: "Manage your plan, devices and premium perks.", icon: Star, color: "from-amber-400 to-amber-600" },
};

export default function Placeholder({ page }: { page: string }) {
  const meta = map[page] ?? map.care;
  const Icon = meta.icon;
  return (
    <div className="space-y-8">
      <div className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${meta.color} p-8 text-white card-shadow`}>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">{meta.title}</h2>
            <p className="mt-1.5 text-sm text-white/90">{meta.subtitle}</p>
          </div>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {["Overview", "Schedule", "Reports", "Settings"].map((t) => (
            <div key={t} className="rounded-2xl bg-white/15 p-5 backdrop-blur">
              <div className="text-xs uppercase tracking-wider text-white/80">{t}</div>
              <div className="mt-2 text-3xl font-bold">—</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-5 card-shadow">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-ink">Coming Soon</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              This module is being crafted with care. Features will include AI-driven recommendations, goal tracking, and seamless clinician collaboration.
            </p>
            <button className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary-light px-4 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white">
              Notify me
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
