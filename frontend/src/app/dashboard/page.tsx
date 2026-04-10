"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";
import type { User, DemoCredential } from "@/lib/types";
import DemoBar from "@/components/DemoBar";
import Sidebar from "@/components/Sidebar";
import LibrarySection from "@/components/LibrarySection";
import PeopleSection from "@/components/PeopleSection";
import ManagementSection from "@/components/ManagementSection";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<DemoCredential[]>([]);
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
    try {
      const stored = localStorage.getItem("rd_demo_creds");
      if (stored) setCredentials(JSON.parse(stored));
    } catch { /* ignore */ }
    fetchUser();
  }, [fetchUser]);

  function handleSwitch() {
    setLoading(true);
    setSection("library");
    fetchUser();
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
      <DemoBar
        user={user}
        credentials={credentials}
        onSwitch={handleSwitch}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          role={user.role}
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
