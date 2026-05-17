"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";
import type { User } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import LibrarySection from "@/components/LibrarySection";
import PeopleSection from "@/components/PeopleSection";
import ManagementSection from "@/components/ManagementSection";
import Inbox from "@/components/Inbox";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [section, setSection] = useState("library");
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const u = await api<User>("GET", "/api/auth/me");
      setUser(u);
    } catch {
      setToken(null);
      router.replace("/login");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  function handleLogout() {
    setToken(null);
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 h-12 flex items-center justify-between shrink-0 z-20">
        <span className="font-semibold text-gray-900 text-sm">Researcher's Diary</span>
        <div className="flex items-center gap-3">
          <Inbox onAccepted={fetchUser} />
          <span className="text-sm text-gray-700 font-medium">{user.name ?? user.email}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          role={user.role}
          institutionId={user.institution_id}
          current={section}
          onNavigate={setSection}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-5xl">
            {section === "library" && <LibrarySection user={user} />}
            {section === "people" && <PeopleSection user={user} />}
            {section === "management" && <ManagementSection user={user} />}
          </div>
        </div>
      </div>
    </div>
  );
}
