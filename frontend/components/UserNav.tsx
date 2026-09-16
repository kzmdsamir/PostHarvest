"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { PLAN_LABELS } from "@/lib/types";
import { LogOut, User as UserIcon } from "lucide-react";

export function UserNav() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="px-4 py-2 text-xs text-neutral-500 animate-pulse">
        Loading session...
      </div>
    );
  }

  // Signed-out visitors sign in from the top bar, so nothing is rendered here.
  if (!user) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-t border-neutral-800/80 mt-2">
      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-200 truncate">
              {profile?.display_name || user.email?.split("@")[0] || "User"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-semibold tracking-wider text-blue-400 bg-blue-500/10 rounded uppercase">
                {PLAN_LABELS[profile?.plan ?? ""] ?? "Free"} Plan
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
