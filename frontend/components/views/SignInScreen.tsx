"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Four-color Google "G" mark used on the primary social sign-in button. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-sans text-3xl font-light text-white tabular-nums">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    </div>
  );
}

/**
 * Full-screen authentication view (hard gate + /login) in the MailAccess macro
 * layout: dark editorial panel on the left, white action card on the right.
 *
 * Signs in via Google or email/password. When the user becomes authenticated
 * the caller re-renders (the (app) shell appears, or we redirect to "/").
 */
export function SignInScreen() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A signed-in visitor landing on /login is sent to the dashboard.
  useEffect(() => {
    if (user && !loading) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white font-sans text-black">
      {/* Left — editorial panel (dark), desktop only */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-zinc-800 bg-zinc-950 p-12 text-white lg:flex xl:p-16">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 bg-red-600" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-400">postharvest</span>
        </div>

        <div className="max-w-lg">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-red-600">one door in</p>
          <h1 className="mt-5 font-sans text-5xl font-semibold leading-[1.05] tracking-tighter xl:text-6xl">
            One pipeline
            <br />
            to get all of it.
          </h1>
          <p className="mt-6 max-w-md text-[17px] font-light leading-[1.7] text-zinc-400">
            Sign in with Google or email — your targets, saved sessions and exports follow you. First time
            here? Your account is created the moment you sign in.
          </p>
          <div className="mt-10 flex items-center gap-12">
            <Stat value="3" label="tiers" />
            <Stat value="2" label="engines" />
            <Stat value="0" label="passwords stored" />
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          authorized use · public pages only
        </p>
      </div>

      {/* Right — action card */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-12 sm:px-8 lg:w-1/2">
        {/* Compact brand row, mobile only */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="h-2 w-2 bg-red-600" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-500">postharvest</span>
        </div>

        <div className="w-full max-w-md border border-neutral-200">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-red-700">
              sign in · sign up
            </span>
            <Link
              href="/docs"
              className="font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400 transition-colors hover:text-black"
            >
              need help?
            </Link>
          </div>

          <div className="px-6 py-8">
            <h2 className="font-sans text-2xl font-semibold tracking-tight">
              Continue to your investigations.
            </h2>

            <button
              type="button"
              onClick={() => void handleGoogle()}
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-3 border border-neutral-300 bg-white px-4 py-3 font-sans text-sm font-medium transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleMark className="h-5 w-5" />
              Continue with Google
            </button>

            <div className="mt-3 flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-400">
              <span>we request · name · email · photo</span>
              <span>we never ask · mail · contacts · drive</span>
            </div>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-neutral-200" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">or</span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="signin-email"
                  className="block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500"
                >
                  Email
                </label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="border-neutral-300 bg-white placeholder:text-neutral-400"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="signin-password"
                  className="block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500"
                >
                  Password
                </label>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="border-neutral-300 bg-white placeholder:text-neutral-400"
                />
              </div>

              {error ? (
                <p className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : mode === "login" ? (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Mail className="h-4 w-4" aria-hidden="true" />
                )}
                {mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === "login" ? "signup" : "login");
              }}
              className="mt-5 w-full text-center text-xs text-neutral-500 transition-colors hover:text-black"
            >
              {mode === "login" ? "No account yet? Create one" : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="border-t border-neutral-200 px-6 py-3">
            <p className="text-[11px] leading-relaxed text-neutral-500">
              By continuing you agree to the terms and confirm you only scrape pages you are authorised
              to investigate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}