"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AlertCircle, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Full-screen authentication view (hard gate + /login).
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-500">postharvest</p>
          <h1 className="mt-3 font-sans text-2xl font-semibold tracking-tight text-white">
            {mode === "login" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-neutral-400">
            Dashboard, history and account sessions live behind this gate.
          </p>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleGoogle()}
            disabled={submitting}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-neutral-800" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">or</span>
            <span className="h-px flex-1 bg-neutral-800" />
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="signin-email" className="text-sm font-medium text-neutral-200">
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
                className="bg-neutral-950 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signin-password" className="text-sm font-medium text-neutral-200">
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
                className="bg-neutral-950 text-white"
              />
            </div>

            {error ? (
              <p className="flex items-start gap-2 rounded-sm border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
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
            className="mt-4 w-full text-center text-xs text-neutral-400 transition-colors hover:text-neutral-200"
          >
            {mode === "login" ? "No account yet? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}