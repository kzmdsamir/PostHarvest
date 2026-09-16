"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AccountSession, PersonalLoginRequest } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogSection } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function StatusBadge({ status }: { status?: string | null }) {
  const valid = status === "VALID";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
        (valid
          ? "border-green-700/40 bg-green-700/10 text-green-700"
          : "border-amber-700/40 bg-amber-700/10 text-amber-700")
      }
    >
      {valid ? "valid" : "expired"}
    </span>
  );
}

export default function AccountsPage() {
  const { profile } = useAuth();
  const isOps = profile?.role === "ops";

  const [ops, setOps] = useState<AccountSession[]>([]);
  const [mine, setMine] = useState<AccountSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [form, setForm] = useState<PersonalLoginRequest>({ name: "", email: "", password: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAccounts();
      setOps(res.ops);
      setMine(res.mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load saved sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback(
    async (scope: string, name: string) => {
      setDeleting(`${scope}/${name}`);
      setError(null);
      try {
        await api.deleteAccount(scope, name);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : `Could not remove "${name}"`);
      } finally {
        setDeleting(null);
      }
    },
    [load],
  );

  const closeAdd = () => {
    setAddOpen(false);
    setAddError(null);
    setForm({ name: "", email: "", password: "" });
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      await api.addPersonalAccount({ ...form, name: form.name.trim() });
      closeAdd();
      await load();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add session");
    } finally {
      setAdding(false);
    }
  };

  const total = ops.length + mine.length;

  const renderRow = (account: AccountSession) => (
    <li key={`${account.scope}/${account.name}`} className="flex items-center gap-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border text-muted-foreground">
        <KeyRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {account.name}
          <StatusBadge status={account.status} />
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {account.scope === "me" ? "personal session" : "operator pool"}
          {account.saved_at ? ` · saved ${formatDateTime(account.saved_at)}` : ""}
        </p>
      </div>
      {account.scope === "ops" && !isOps ? (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">managed</span>
      ) : (
        <button
          type="button"
          onClick={() => void handleDelete(account.scope, account.name)}
          disabled={deleting === `${account.scope}/${account.name}`}
          className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          {deleting === `${account.scope}/${account.name}` ? "removing…" : "remove"}
        </button>
      )}
    </li>
  );

  if (loading && total === 0) {
    return (
      <div className="animate-fade-in-up">
        <p className="py-12 text-center text-sm text-muted-foreground">loading sessions…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Saved sessions</CardTitle>
            <CardDescription className="mt-1">
              Cookie sessions that unlock the full Facebook feed for browser scrapes. Metadata only — cookie contents
              are never exposed.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setAddOpen(true)} disabled={adding}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add my session
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-sm border border-border bg-muted/40 px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs transition-colors hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={1.75} /> retry
              </button>
            </div>
          ) : null}

          {/* Operator pool */}
          <section>
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operator pool · shared
              </h3>
              <span className="ml-auto text-xs text-muted-foreground">{ops.length}</span>
            </div>
            {ops.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No operator-managed sessions. Operators add them with{" "}
                <code className="rounded-sm bg-muted px-1.5 py-0.5">cli.py login --account NAME</code>.
              </p>
            ) : (
              <ul className="divide-y divide-border">{ops.map(renderRow)}</ul>
            )}
          </section>

          {/* Personal sessions */}
          <section className="mt-6">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My sessions</h3>
              <span className="ml-auto text-xs text-muted-foreground">{mine.length}</span>
            </div>
            {mine.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No personal sessions yet. Add one to log into Facebook from here — the resulting cookies unlock the
                full feed for your scrapes only.
              </p>
            ) : (
              <ul className="divide-y divide-border">{mine.map(renderRow)}</ul>
            )}
          </section>
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onClose={() => void closeAdd()}
        title="Add my Facebook session"
        description="You'll sign in to Facebook once; only the resulting session cookies are stored with your account (never the password)."
      >
        <form onSubmit={(e) => void handleAdd(e)} className="space-y-4">
          <DialogSection>
            <div className="space-y-1.5">
              <label htmlFor="add-name" className="text-sm font-medium">
                Session name
              </label>
              <Input
                id="add-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. personal-a"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="add-email" className="text-sm font-medium">
                Facebook email
              </label>
              <Input
                id="add-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="add-password" className="text-sm font-medium">
                Facebook password
              </label>
              <Input
                id="add-password"
                type="password"
                autoComplete="off"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-muted-foreground">
                Sent once to Facebook in a headless login; discarded immediately after.
              </p>
            </div>
            {addError ? (
              <p className="rounded-sm border border-red-700/40 bg-red-700/10 px-3 py-2 text-xs text-red-700">{addError}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => void closeAdd()}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
                Sign in to Facebook
              </Button>
            </div>
          </DialogSection>
        </form>
      </Dialog>
    </div>
  );
}