"use client";

import type { UserRole } from "@/lib/types";

const ROLE_LEVEL: Record<UserRole, number> = {
  researcher: 0,
  department_head: 1,
  institution_head: 2,
  admin: 3,
};

interface NavItem {
  id: string;
  label: string;
  icon: string;
  minRole?: UserRole;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "library", label: "Library", icon: "📄" },
  { id: "people", label: "People", icon: "👥" },
  { id: "management", label: "Management", icon: "⚙️", minRole: "institution_head" },
];

interface Props {
  role: UserRole;
  current: string;
  onNavigate: (section: string) => void;
}

export default function Sidebar({ role, current, onNavigate }: Props) {
  const level = ROLE_LEVEL[role];

  return (
    <div className="w-40 shrink-0 bg-white border-r border-gray-200 p-2 flex flex-col gap-0.5">
      {NAV_ITEMS.filter((item) => {
        if (item.minRole && level < ROLE_LEVEL[item.minRole]) return false;
        return true;
      }).map((item) => {
        const active = current === item.id;
        const isAdmin = item.id === "management";
        const cls = active
          ? isAdmin
            ? "bg-rose-50 text-rose-700 font-medium"
            : "bg-indigo-50 text-indigo-700 font-medium"
          : isAdmin
            ? "text-rose-500 hover:bg-rose-50"
            : "text-gray-600 hover:bg-gray-100";
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${cls}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
