"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";
import { TEXT } from "@/lib/constants";
import { useLoad } from "@/lib/hooks";
import type { Invitation, User } from "@/lib/types";
import LibrarySection from "@/components/LibrarySection";
import ManagementSection from "@/components/ManagementSection";
import PeopleSection from "@/components/PeopleSection";
import Sidebar, { getNavItems } from "@/components/Sidebar";
import UserProfileModal from "@/components/UserProfileModal";
import { Loading } from "@/components/ui";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [section, setSection] = useState("library");
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [libraryRefresh, setLibraryRefresh] = useState(0);

  const fetchUser = useCallback(async () => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    try {
      setUser(await api<User>("GET", "/api/auth/me"));
    } catch {
      setToken(null);
      router.replace("/login");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const { data: invites, reload: refreshInvites } = useLoad(() =>
    api<Invitation[]>("GET", "/api/invitations/received").catch(() => [] as Invitation[]),
  );
  const inviteCount = invites?.length ?? 0;

  function handleLogout() {
    setToken(null);
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  const navItems = getNavItems(user.role, user.institution_id);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <div className="border-b border-dust-300 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 z-20">
        <span className="text-sm font-semibold tracking-tight">{TEXT.common.appName}</span>
        <div className="flex items-center gap-2.5 sm:gap-4">
          <nav className="hidden md:flex items-stretch gap-5 self-stretch">
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex items-center text-sm px-1 border-b-2 transition-colors ${active
                    ? "text-ink font-medium border-hunter"
                    : "text-dust-600 hover:text-ink border-transparent"
                    }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="hidden md:block w-px h-5 bg-dust-300" />
          <button
            onClick={() => setShowProfile(true)}
            className="relative flex items-center gap-2.5 py-1 px-1.5 rounded-lg hover:bg-dust-100 transition-colors"
          >
            {inviteCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-fern border-2 border-dust-50" />
            )}
            <span className="text-sm font-medium truncate max-w-32 sm:max-w-none">
              {user.name ?? user.email}
            </span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 pb-24 md:px-14 md:pt-11">
          {section === "library" && <LibrarySection user={user} refreshKey={libraryRefresh} />}
          {section === "people" && <PeopleSection user={user} />}
          {section === "management" && <ManagementSection user={user} />}
        </div>
      </div>

      <Sidebar
        role={user.role}
        institutionId={user.institution_id}
        current={section}
        onNavigate={setSection}
      />

      {showProfile && (
        <UserProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSaved={fetchUser}
          onImported={() => setLibraryRefresh((v) => v + 1)}
          onLogout={handleLogout}
          onInvitesChanged={refreshInvites}
        />
      )}
    </div>
  );
}
