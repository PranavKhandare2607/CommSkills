import { Zap, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";

export function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: sub } = useSubscription();

  if (!sub || !sub.isInTrial || dismissed) return null;

  const days = sub.trialDaysRemaining;
  const urgent = days <= 3;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
        urgent
          ? "bg-amber-500 text-white"
          : "bg-indigo-500/20 text-indigo-100 border-b border-indigo-800/40"
      }`}
    >
      <Zap className={`w-4 h-4 shrink-0 ${urgent ? "text-white" : "text-amber-400"}`} />
      <span className="flex-1">
        {urgent
          ? `⚡ Only ${days} day${days !== 1 ? "s" : ""} left in your free trial!`
          : `${days} day${days !== 1 ? "s" : ""} left in your Premium trial`}
      </span>
      <Link href="/pricing">
        <button className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-lg ${
          urgent ? "bg-white text-amber-600 hover:bg-amber-50" : "bg-indigo-600 text-white hover:bg-indigo-500"
        }`}>
          Upgrade
        </button>
      </Link>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
