import {
  ResponsiveContainer,
  Line,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Brain,
  Share2,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Activity,
  Moon,
  Droplets,
  Target,
  Dumbbell,
  CalendarCheck,
  Gamepad2,
  BookOpen,
  Check,
  Sparkles,
  Heart,
} from "./icons";

/* ────────── Data ────────── */
const cognitiveData = [
  { day: "Mon", v: 60 }, { day: "Tue", v: 62 }, { day: "Wed", v: 58 },
  { day: "Thu", v: 68 }, { day: "Fri", v: 73 }, { day: "Sat", v: 71 }, { day: "Sun", v: 73 },
];

const speechData = [
  { day: "Mon", v: 70 }, { day: "Tue", v: 72 }, { day: "Wed", v: 75 },
  { day: "Thu", v: 78 }, { day: "Fri", v: 82 }, { day: "Sat", v: 84 }, { day: "Sun", v: 85 },
];

const sleepData = [
  { phase: "Deep", value: 22, color: "#1f6fd9" },
  { phase: "Rem", value: 28, color: "#2b88f8" },
  { phase: "Light", value: 50, color: "#9cc9ff" },
];

const socialData = [
  { d: "S", h: 1.5 }, { d: "M", h: 2.3 }, { d: "T", h: 2.8 }, { d: "W", h: 4.0 },
  { d: "T2", h: 3.2 }, { d: "F", h: 3.6 }, { d: "S2", h: 3.8 },
];

const activityLevel = [
  { name: "Events", value: 40, color: "#a7d0ff" },
  { name: "Exercise", value: 60, color: "#2b88f8" },
  { name: "Routine", value: 20, color: "#f472b6" },
];

const activityLog = [
  { time: "08:00 AM", title: "Morning Routine", tag: "Daily living", status: "On Schedule", icon: CalendarCheck, dotColor: "bg-primary" },
  { time: "08:00 AM", title: "Medications", tag: "Daily living", status: "On Track", icon: CalendarCheck, dotColor: "bg-primary" },
  { time: "07:40 AM", title: "Self-Care", tag: "Daily living", status: "On Schedule", icon: Heart, dotColor: "bg-primary" },
  { time: "06:12 PM", title: "Evening Routine", tag: "Daily living", status: "Completed", icon: Check, dotColor: "bg-emerald-500" },
  { time: "06:08 PM", title: "Relaxation Exercise", tag: "Daily living", status: "On Track", icon: Sparkles, dotColor: "bg-primary" },
  { time: "05:50 PM", title: "Social Call", tag: "Connection", status: "On Schedule", icon: CalendarCheck, dotColor: "bg-primary" },
];

/* ────────── Reusable ────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] bg-white/80 p-5 backdrop-blur-xl card-shadow ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <div className="flex items-center gap-1">{right}</div>
    </div>
  );
}

function MetricCard({
  icon, label, value, delta, deltaPositive, accent, children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
          <span className="text-[13px] font-medium text-muted">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-primary-light hover:text-primary transition-colors" title="Share">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-primary-light hover:text-primary transition-colors" title="More">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[28px] leading-none font-bold tracking-tight text-ink">{value}</div>
          <div className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${deltaPositive ? "text-emerald-600" : "text-rose-500"}`}>
            {deltaPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{delta}</span>
          </div>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

/* ══════════ DASHBOARD ══════════ */
export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* ─── Daily Wellness ─── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Daily Wellness</h2>
          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-muted hover:bg-primary-light hover:text-primary card-shadow transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-muted hover:bg-primary-light hover:text-primary card-shadow transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
          {/* Cognitive Index */}
          <MetricCard
            icon={<Brain className="h-[18px] w-[18px] text-primary" />}
            label="Cognitive Index" value="73%" delta="12% vs Last Week"
            deltaPositive accent="bg-primary-light"
          >
            <div className="h-[72px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cognitiveData}>
                  <defs>
                    <linearGradient id="cogGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2b88f8" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#2b88f8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#2b88f8" strokeWidth={2} fill="url(#cogGrad)" dot={false} />
                  <Line type="monotone" dataKey="v" stroke="none" dot={{ r: 2.8, fill: "#2b88f8", stroke: "#fff", strokeWidth: 1.8 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </MetricCard>

          {/* Speech Score */}
          <MetricCard
            icon={<Activity className="h-[18px] w-[18px] text-primary" />}
            label="Speech Score" value="85%" delta="4% vs Last Week"
            deltaPositive={false} accent="bg-primary-light"
          >
            <div className="h-[72px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speechData} barCategoryGap="35%">
                  <Bar dataKey="v" radius={[5, 5, 0, 0]} maxBarSize={22}>
                    {speechData.map((_, i) => (
                      <Cell key={i} fill={i === speechData.length - 1 ? "#2b88f8" : "#cfe0f7"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </MetricCard>

          {/* Sleep Quality */}
          <MetricCard
            icon={<Moon className="h-[18px] w-[18px] text-primary" />}
            label="Sleep Quality" value="65%" delta="15m vs Last Week"
            deltaPositive accent="bg-primary-light"
          >
            <div className="flex h-[72px] items-center gap-3">
              <div className="flex-1 space-y-1.5">
                {sleepData.map((s) => (
                  <div key={s.phase} className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="w-9 shrink-0">{s.phase}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.value}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative h-14 w-14 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sleepData} dataKey="value" innerRadius={16} outerRadius={24} startAngle={90} endAngle={-270} paddingAngle={1} strokeWidth={0}>
                      {sleepData.map((s, i) => (<Cell key={i} fill={s.color} />))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-ink">65%</div>
              </div>
            </div>
          </MetricCard>
        </div>
      </section>

      {/* ─── Lifestyle + Activity Log ─── */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Lifestyle — left */}
        <Card>
          <CardHeader
            title="Lifestyle"
            right={
              <button className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-primary transition-colors" title="More options">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Social Time */}
            <div className="rounded-2xl bg-soft/50 p-4 border border-transparent hover:border-border/60 transition-colors">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-primary">
                    <UsersIcon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px] font-semibold text-ink">Social Time</span>
                </div>
                <span className="text-[10px] text-muted">Daily avg</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-[22px] font-bold leading-none text-ink">4h</span>
                <span className="text-sm font-semibold text-emerald-600">+15m</span>
              </div>
              <div className="flex items-end justify-between gap-1 h-[84px] pt-1">
                {socialData.map((s, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="relative flex w-full max-w-[24px] items-end justify-center h-full">
                      <div
                        className={`w-full rounded-[3px] ${i === 3 ? "bg-gradient-to-t from-primary to-accent" : "bg-[#cce0fc]"}`}
                        style={{ height: `${Math.max((s.h / 5) * 100, 16)}%` }}
                      />
                      <div
                        className={`absolute -top-0.5 h-2 w-2 rounded-full border-[1.5px] border-white shadow-sm ${
                          i === 3 ? "bg-primary" : "bg-[#b8d4f5]"
                        }`}
                        style={{ bottom: `${Math.max((s.h / 5) * 100, 8)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${i === 3 ? "text-primary" : "text-muted/70"} tabular-nums`}>{s.d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Level */}
            <div className="rounded-2xl bg-soft/50 p-4 border border-transparent hover:border-border/60 transition-colors">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-primary">
                  <Dumbbell className="h-3.5 w-3.5" />
                </div>
                <span className="text-[13px] font-semibold text-ink">Activity Level</span>
              </div>
              <div className="space-y-3 mt-3">
                {activityLevel.map((a, i) => {
                  const labels = ["Events", "Exercise", "Routine"];
                  const counts = ["2/5", "3/5", "1/5"];
                  return (
                    <div key={i}>
                      <div className="mb-1.5 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-muted">{labels[i]}</span>
                        <span className="font-bold text-ink tabular-nums">{counts[i]}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/80">
                        <div className="h-full rounded-full transition-all" style={{ width: `${a.value}%`, background: a.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Relaxation */}
            <div className="rounded-2xl bg-gradient-to-br from-primary-light/55 to-white p-4 border border-primary/8">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/85 shadow-sm text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="text-[13px] font-semibold text-ink">Relaxation</span>
              </div>
              <div className="flex items-center justify-center py-2">
                <div className="relative h-[120px] w-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="96%" startAngle={210} endAngle={-30} barSize={9}
                      data={[{ name: "relax", value: 72, fill: "#2b88f8" }]}
                    >
                      <RadialBar cornerRadius={8} background={{ fill: "#e0ecfd" }} dataKey="value" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[22px] font-bold leading-none text-ink">43<span className="text-xs font-semibold text-muted ml-0.5">mins</span></span>
                    <span className="mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                      <TrendingUp className="h-2.5 w-2.5" />+15m vs Y'day
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hydration */}
            <div className="rounded-2xl bg-soft/50 p-4 border border-transparent hover:border-border/60 transition-colors">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-primary">
                  <Droplets className="h-3.5 w-3.5" />
                </div>
                <span className="text-[13px] font-semibold text-ink">Hydration</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className="text-[22px] font-bold leading-none text-ink">1,080</span>
                <span className="text-xs font-medium text-muted">ml</span>
              </div>
              <div className="text-[11px] text-muted">Remaining: <span className="font-semibold text-ink">920 ml</span></div>
              <div className="text-[11px] text-muted">Yesterday: <span className="font-semibold text-ink">3,220 ml</span></div>
              <div className="mt-3 flex items-end gap-1 h-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                  <div key={g} className={`flex-1 rounded-t-md min-w-[6px] ${g <= 4 ? "bg-gradient-to-t from-primary via-primary to-accent" : "bg-white"}`} />
                ))}
              </div>
              <div className="mt-1 text-[10px] text-muted">Drink Glasses : 4</div>
            </div>

            {/* Brain Health */}
            <div className="rounded-2xl bg-soft/50 p-4 border border-transparent hover:border-border/60 transition-colors">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-primary">
                  <Brain className="h-3.5 w-3.5" />
                </div>
                <span className="text-[13px] font-semibold text-ink">Brain Health</span>
              </div>
              <div className="space-y-3 mt-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-medium text-muted"><Gamepad2 className="h-3 w-3" /> Memory Games</span>
                    <span className="font-bold text-ink tabular-nums">2/3</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/80">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-accent" />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-medium text-muted"><BookOpen className="h-3 w-3" /> Brain Training</span>
                    <span className="font-bold text-ink tabular-nums">1/3</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/80">
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-pink-400 to-pink-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Goals */}
            <div className="row-span-1 sm:col-span-2 rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-5 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/18">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px] font-semibold">Daily Goals</span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="relative h-[110px] w-[110px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="94%" startAngle={90} endAngle={-270} barSize={8}
                        data={[{ name: "goals", value: 78, fill: "#ffffff" }]}
                      >
                        <RadialBar cornerRadius={8} background={{ fill: "rgba(255,255,255,0.18)" }} dataKey="value" />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[22px] font-bold leading-none">78%</span>
                      <span className="text-[9px] opacity-85 mt-0.5">Complete</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-snug opacity-95">Progress is Good</p>
                    <p className="mt-1 text-[11px] leading-relaxed opacity-75">— keep going! You're on track for today's wellness targets.</p>
                    <button className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/18 px-3 py-1.5 text-[11px] font-semibold hover:bg-white/28 transition-colors">
                      <Check className="h-3 w-3" /> View plan
                    </button>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/8 blur-2xl" />
              <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-white/6 blur-xl" />
            </div>
          </div>
        </Card>

        {/* Activity Log — right */}
        <Card>
          <CardHeader
            title="Activity Log"
            right={
              <button className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:bg-soft hover:text-primary transition-colors">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            }
          />
          <ul className="scrollbar-thin -mr-1 pr-1 space-y-2.5 max-h-[520px] overflow-y-auto">
            {activityLog.map((a, i) => {
              const IconComp = a.icon;
              return (
                <li key={i} className="group flex gap-3 rounded-2xl bg-soft/45 px-4 py-3 hover:bg-primary-light/35 transition-colors cursor-default">
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.dotColor === "bg-emerald-500" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"}`}>
                      <IconComp className="h-[18px] w-[18px]" />
                    </div>
                    {i !== activityLog.length - 1 && (
                      <div className="mt-1.5 w-px flex-1 bg-border/60 self-stretch" style={{ minHeight: 12 }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-muted tabular-nums">{a.time}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        a.status === "Completed" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50/80 text-primary"
                      }`}>● {a.status}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[13px] font-semibold text-ink group-hover:text-primary transition-colors">{a.title}</div>
                    <div className="text-[11px] text-muted mt-0.5">{a.tag}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
