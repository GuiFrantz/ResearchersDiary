"use client";

import { useState } from "react";
import { setToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import type { User, DemoCredential } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  researcher: "Researcher",
  department_head: "Dept Head",
  institution_head: "Inst Head",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  researcher: "bg-gray-100 text-gray-700",
  department_head: "bg-blue-100 text-blue-700",
  institution_head: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
};

interface Props {
  user: User | null;
  credentials: DemoCredential[];
  onSwitch: () => void;
}

export default function DemoBar({ user, credentials, onSwitch }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isDemo = credentials.length > 0;

  function switchTo(cred: DemoCredential) {
    setToken(cred.token);
    setOpen(false);
    onSwitch();
  }

  function handleLogout() {
    setToken(null);
    localStorage.removeItem("rd_demo_creds");
    router.replace("/login");
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 h-12 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-2.5">
        <span className="font-semibold text-gray-900 text-sm">Researcher&apos;s Diary</span>
        {isDemo && (
          <span className="text-xs bg-indigo-100 text-indigo-600 font-medium px-2 py-0.5 rounded-full">Demo</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isDemo && (
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 py-1 px-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <span className="font-medium">Switch Account</span>
              <span className="text-xs">&#9662;</span>
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Demo Accounts</div>
                  </div>
                  {credentials.map((cred) => (
                    <button
                      key={cred.email}
                      onClick={() => switchTo(cred)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                        cred.email === user?.email ? "bg-indigo-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{cred.name}</div>
                          <div className="text-xs text-gray-400">
                            {ROLE_LABELS[cred.role]}
                            {cred.institution && <span> &middot; {cred.institution}</span>}
                          </div>
                        </div>
                        {cred.email === user?.email && (
                          <span className="text-indigo-500 text-xs">&#9679;</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* User info + logout */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="font-medium">{user?.name}</span>
          {user && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-600 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
