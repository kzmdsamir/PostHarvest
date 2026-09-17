import type { Metadata } from "next";
import PricingPage from "./page-content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Three honest tiers — Basic, Pro, Enterprise — with the enforced per-job, per-source, concurrency and account limits.",
};

export default function Page() {
  return <PricingPage />;
}