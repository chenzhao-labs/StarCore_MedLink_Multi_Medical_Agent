import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Pill,
  Users,
  FlaskConical,
  Star,
  Phone,
  Watch,
  ChevronLeft,
  Plus,
  Stethoscope,
} from "./icons";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
};

const mainMenu: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { label: "AI Consult", icon: Stethoscope, key: "chat" },
  { label: "Care Plan", icon: ClipboardList, key: "care" },
  { label: "Pharmacy", icon: Pill, key: "pharmacy" },
  { label: "Community", icon: Users, key: "community" },
];

const additional: NavItem[] = [
  { label: "Clinical Trials", icon: FlaskConical, key: "trials" },
  { label: "Subscriptions", icon: Star, key: "subs" },
];

const contacts = [
  { name: "120", role: "Emergency", color: "bg-red-100 text-red-500", avatar: undefined as string | undefined },
  { name: "Sarah", role: "Caregiver", color: "bg-primary-light text-primary", avatar: "S" },
  { name: "Dr. Johnes", role: "Physician", color: "bg-emerald-100 text-emerald-600", avatar: "J" },
];

type Props = {
  active: string;
  onSelect: (key: string) => void;
};

export default function Sidebar({ active, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const NavGroup = ({ items }: { items: NavItem[] }) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <li key={item.key}>
            <button
              onClick={() => onSelect(item.key)}
              className={`group flex w-full items-center gap-3 rounded-2xl py-2.5 text-xs font-medium transition-all ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${
                isActive
                  ? "bg-primary text-white shadow-[0_6px_16px_-6px_rgba(43,136,248,0.55)]"
                  : "text-slate-600 hover:bg-white/80 hover:text-primary"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`flex h-full shrink-0 flex-col rounded-[28px] bg-white/70 p-4 backdrop-blur-xl overflow-hidden transition-all ${
        collapsed ? "w-[60px]" : "w-[200px]"
      }`}
    >
      {/* Scrollable nav area */}
      <div className="scrollbar-thin flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-5 pt-1">
        <div className="flex items-center justify-between px-3 pb-1">
          {!collapsed && <span className="text-[9px] font-semibold uppercase tracking-widest text-muted/70">Main Menu</span>}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted hover:bg-primary-light hover:text-primary transition-colors"
          >
            <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? "-rotate-180" : ""}`} />
          </button>
        </div>

        <NavGroup items={mainMenu} />

        {!collapsed && <div className="pt-2 px-3 pb-1 text-[9px] font-semibold uppercase tracking-widest text-muted/70">Additional</div>}
        <NavGroup items={additional} />

        {/* Invite */}
        {!collapsed && (
          <button className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left hover:bg-white/80 transition-colors">
            <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-xs font-medium text-ink">Invite a member</span>
          </button>
        )}

        {/* Emergency Contacts */}
        {!collapsed && (
          <div>
            <div className="px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted/70">Emergency Contacts</div>
            <ul className="space-y-1.5">
              {contacts.map((c) => (
                <li key={c.name} className="flex items-center gap-2.5 rounded-2xl bg-white/70 px-3 py-2.5 hover:bg-white transition-colors cursor-pointer group">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${c.color}`}>
                    {c.avatar ?? <Phone className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-ink truncate">{c.name}</div>
                    <div className="text-[10px] text-muted">{c.role}</div>
                  </div>
                  <button className="shrink-0 rounded-full bg-primary-light px-2 py-1 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-opacity">
                    Call
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Devices */}
        {!collapsed && (
          <div>
            <div className="px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted/70">Devices</div>
            <button className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left hover:bg-white/80 transition-colors">
              <Watch className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-xs font-medium text-ink">Connect devices</span>
            </button>
          </div>
        )}
      </div>

    </aside>
  );
}
