"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "./AuthModal";
import { PLAN_LABELS } from "@/lib/types";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";

export function UserNav() {
  const { user, profile, loading, signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"login" | "signup">("login");

  if (loading) {
    return (
      <div className="px-4 py-2 text-xs text-neutral-500 animate-pulse">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="px-3 py-2 space-y-2">
          <button
            onClick={() => {
              setModalTab("login");
              setModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            onClick={() => {
              setModalTab("signup");
              setModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs rounded-lg transition-colors border border-neutral-700/60"
          >
            <span>Create Account</span>
          </button>
        </div>
        <AuthModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          defaultTab={modalTab}
        />
      </>
    );
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
