"use client";

import { NAV_ITEMS, ROLE_LEVEL } from "@/lib/constants";
import type { NavItem, UserRole } from "@/lib/types";
import Icon from "./icons";

export function getNavItems(role: UserRole, institutionId: string | null): NavItem[] {
  const level = ROLE_LEVEL[role];
  return NAV_ITEMS.filter((item) => {
    if (item.minRole && level < ROLE_LEVEL[item.minRole]) return false;
    if (item.id === "management" && institutionId === null) return false;
    return true;
  });
}

interface Props {
  role: UserRole;
  institutionId: string | null;
  current: string;
  onNavigate: (section: string) => void;
}

export default function Sidebar({ role, institutionId, current, onNavigate }: Props) {
  const items = getNavItems(role, institutionId);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-dust-50 border-t border-dust-300 flex pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const active = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${active ? "text-hunter font-medium" : "text-dust-600"}`}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
