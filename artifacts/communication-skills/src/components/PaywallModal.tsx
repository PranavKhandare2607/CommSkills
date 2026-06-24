import { X, Zap, Check, Lock } from "lucide-react";
import { Link } from "wouter";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "limit" | "locked";
  featureName?: string;
  remaining?: number;
  limit?: number;
}

const premiumFeatures = [
  "Unlimited grammar checks",
  "Unlimited vocabulary lookups",
  "Unlimited AI Coach messages",
  "Unlimited speaking practice",
  "AI Companion (Aisha & Priya)",
  "Communication Analyzer",
  "Full progress tracking",
];

export function PaywallModal({
  open,
  onClose,
  reason = "limit",
  featureName,
  remaining,
  limit,
}: PaywallModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            {reason === "locked" ? (
              <Lock className="w-8 h-8 text-indigo-200" />
            ) : (
              <Zap className="w-8 h-8 text-amber-300" />
            )}
            <div>
              <h2 className="text-xl font-bold">
                {reason === "locked" ? "Premium Feature" : "Daily Limit Reached"}
              </h2>
              <p className="text-indigo-200 text-sm">
                {reason === "locked"
                  ? `${featureName || "This feature"} requires Premium`
                  : `You've used all ${limit} free ${featureName || "uses"} today`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-600 text-sm mb-5">
            {reason === "locked"
              ? "Upgrade to Premium to unlock this feature and get unlimited access to everything."
              : `Your daily free limit resets at midnight. Upgrade to Premium for unlimited access.`}
          </p>

          <div className="space-y-2 mb-6">
            {premiumFeatures.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>

          <Link href="/pricing" onClick={onClose}>
            <button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl transition-all mb-3">
              View Plans & Upgrade
            </button>
          </Link>
          <button
            onClick={onClose}
            className="w-full text-slate-500 hover:text-slate-700 text-sm py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
