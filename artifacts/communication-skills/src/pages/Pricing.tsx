import { Check, Zap, Crown, Lock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const freeFeatures = [
  "3 grammar checks / day",
  "5 vocabulary lookups / day",
  "10 AI Coach messages / day",
  "2 speaking sessions / day",
  "7 C's framework & quizzes",
  "Resources library",
  "Basic progress tracking",
];

const premiumFeatures = [
  "Everything in Free",
  "Unlimited grammar checks",
  "Unlimited vocabulary lookups",
  "Unlimited AI Coach messages",
  "Unlimited speaking practice",
  "AI Companion — Aisha & Priya",
  "Communication Analyzer (7 C's scoring)",
  "Full progress charts & badges",
  "Priority AI responses",
];

export default function Pricing() {
  const { data: sub } = useSubscription();
  const isPremium = sub?.isPremium;
  const isInTrial = sub?.isInTrial;
  const daysLeft = sub?.trialDaysRemaining ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Choose Your Plan</h1>
          <p className="text-slate-500 text-lg">
            Start with a 10-day free Premium trial. No credit card required.
          </p>
          {isInTrial && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
              <Zap className="w-4 h-4" />
              You're on your free trial — {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Free</h2>
              <p className="text-slate-500 text-sm">Perfect for getting started</p>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-slate-900">$0</span>
                <span className="text-slate-400 ml-2">/ month</span>
              </div>
            </div>
            <div className="space-y-3 mb-8">
              {freeFeatures.map((f) => (
                <div key={f} className="flex items-start gap-3 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  {f}
                </div>
              ))}
              <div className="flex items-start gap-3 text-sm text-slate-400">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                AI Companion locked
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-400">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                Communication Analyzer locked
              </div>
            </div>
            <div className="bg-slate-100 text-slate-500 text-center py-3 rounded-xl font-medium text-sm">
              {isPremium && !isInTrial ? "Your current plan after trial" : "Current free plan"}
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </span>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="mb-6 relative">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-300" />
                <h2 className="text-xl font-bold">Premium</h2>
              </div>
              <p className="text-indigo-200 text-sm">Everything, unlimited</p>
              <div className="mt-4">
                <span className="text-4xl font-extrabold">$9.99</span>
                <span className="text-indigo-300 ml-2">/ month</span>
              </div>
            </div>
            <div className="space-y-3 mb-8 relative">
              {premiumFeatures.map((f) => (
                <div key={f} className="flex items-start gap-3 text-sm text-indigo-100">
                  <Check className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <div className="relative">
              {isPremium && !isInTrial ? (
                <div className="bg-white/20 text-white text-center py-3 rounded-xl font-semibold text-sm">
                  ✓ Current Plan
                </div>
              ) : (
                <div>
                  <button
                    className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-3 rounded-xl transition-colors mb-2"
                    onClick={() => alert("Stripe integration coming soon! Connect your Stripe account to enable payments.")}
                  >
                    {isInTrial ? `Upgrade Now — Lock In $9.99/mo` : "Start 10-Day Free Trial"}
                  </button>
                  <p className="text-indigo-200 text-xs text-center">
                    {isInTrial ? "Cancel anytime" : "10 days free · No credit card required"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 bg-white rounded-2xl border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Frequently Asked Questions</h3>
          <div className="space-y-6">
            {[
              {
                q: "What happens after my 10-day trial?",
                a: "After your trial ends, you'll automatically move to the Free plan with daily usage limits. You can upgrade to Premium anytime to restore unlimited access.",
              },
              {
                q: "Do I need a credit card for the trial?",
                a: "No! Your 10-day Premium trial is completely free with no payment information required.",
              },
              {
                q: "Can I cancel my Premium subscription?",
                a: "Yes, you can cancel anytime. You'll keep Premium access until the end of your billing period.",
              },
              {
                q: "What are the free plan daily limits?",
                a: "Free users get 3 grammar checks, 5 vocabulary lookups, 10 AI Coach messages, and 2 speaking sessions per day. Limits reset at midnight.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="font-semibold text-slate-900 mb-1 text-sm">{q}</p>
                <p className="text-slate-500 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
