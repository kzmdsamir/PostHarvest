"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, PageHeading } from "@/components/views/Display";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/**
 * Pricing tiers.
 *
 * The enforceable numbers below mirror the enforcement table in
 * backend/core/plans.py (PLAN_LIMITS) — that file is the canonical source and
 * limits are applied server-side. Display-only rows (price, team users,
 * support) and Enterprise's open-ended values ("Unlimited", "Custom",
 * "Dedicated pool") are marketing-facing; enforcement caps for Enterprise
 * come from the global MAX_URLS_PER_JOB / max_posts settings only.
 */
interface Tier {
  id: "basic" | "pro" | "team" | "enterprise";
  name: string;
  price: string;
  tagline: string;
  limits: Array<{ label: string; value: string }>;
}

const TIERS: Tier[] = [
  {
    id: "basic",
    name: "Basic",
    price: "Free",
    tagline: "A single focused crawl — run the full pipeline end to end.",
    limits: [
      { label: "URLs per job", value: "5" },
      { label: "Posts per source", value: "500" },
      { label: "Concurrent jobs", value: "1" },
      { label: "Saved accounts", value: "1" },
      { label: "Team users", value: "1" },
      { label: "Support", value: "Community" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19/mo",
    tagline: "Serious investigation throughput with room to parallelise.",
    limits: [
      { label: "URLs per job", value: "50" },
      { label: "Posts per source", value: "5,000" },
      { label: "Concurrent jobs", value: "3" },
      { label: "Saved accounts", value: "5" },
      { label: "Team users", value: "3" },
      { label: "Support", value: "Priority" },
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$99/mo",
    tagline: "Shared capacity for small teams running deep, regular crawls.",
    limits: [
      { label: "URLs per job", value: "150" },
      { label: "Posts per source", value: "100,000" },
      { label: "Concurrent jobs", value: "10" },
      { label: "Saved accounts", value: "25" },
      { label: "Team users", value: "10" },
      { label: "Support", value: "Priority" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$190/mo",
    tagline: "Bulk research at scale — no per-account ceiling.",
    limits: [
      { label: "URLs per job", value: "Unlimited" },
      { label: "Posts per source", value: "Custom" },
      { label: "Concurrent jobs", value: "Dedicated pool" },
      { label: "Saved accounts", value: "Unlimited" },
      { label: "Team users", value: "Unlimited" },
      { label: "Support", value: "Dedicated / Slack" },
    ],
  },
];

const SHARED_FEATURES = [
  "HTTP and browser (GraphQL) crawl engines",
  "Live login capture for saved sessions",
  "JSON + XLSX export with honest counts",
  "Per-owner isolation plus ops shared accounts",
];

export default function PricingPage() {
  const { profile } = useAuth();
  const currentPlan = profile?.plan ?? "basic";

  return (
    <div className="w-full animate-fade-in-up">
      <header className="mx-auto w-full max-w-6xl">
        <Eyebrow>Plans</Eyebrow>
        <PageHeading>Pricing</PageHeading>
        <p className="-mt-4 mb-10 max-w-xl font-sans text-sm font-light leading-relaxed text-muted-foreground">
          Four honest tiers. Limits are enforced server-side on every job, so
          the numbers here are the numbers you get.
        </p>
      </header>

      <section
        className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        aria-label="Plans"
      >
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentPlan;
          return (
            <article
              key={tier.id}
              className={cn(
                "flex flex-col border bg-card",
                isCurrent && "border-foreground"
              )}
            >
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium tracking-tight text-foreground">
                    {tier.name}
                  </h2>
                  {isCurrent ? (
                    <Badge variant="default">Your plan</Badge>
                  ) : (
                    <Badge variant="outline">Managed</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                  {tier.tagline}
                </p>
                <p className="mt-4 font-mono text-2xl tabular-nums tracking-tight text-foreground">
                  {tier.price}
                </p>
              </div>

              <dl className="mt-6 flex-1">
                {tier.limits.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-1 border-t border-border px-6 py-3"
                  >
                    <dt className="font-sans text-[11px] font-light uppercase tracking-[0.2em] text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="font-mono text-xs tabular-nums text-foreground">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="border-t border-border p-6">
                <p className="font-sans text-[11px] font-light uppercase tracking-[0.2em] text-muted-foreground">
                  {isCurrent
                    ? "Assigned to your account"
                    : "Assignable by operators"}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <section
        className="mx-auto mt-14 w-full max-w-6xl border-t border-border pt-8"
        aria-label="Included in every plan"
      >
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SHARED_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-highlight"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span className="font-sans text-sm font-light leading-relaxed text-muted-foreground">
                {feature}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-8 font-sans text-xs font-light leading-relaxed text-muted-foreground">
          Plans are assigned by workspace operators from Settings → Users; there
          is no self-serve checkout.
        </p>
      </section>
    </div>
  );
}