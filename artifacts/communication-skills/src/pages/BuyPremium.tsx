import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  Crown,
  Info,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";

const UPI_ID = "8796439008@ybl";
const PRICE = "₹110";

const benefits = [
  "Unlimited AI Coach conversations",
  "Unlimited grammar & word practice",
  "AI Companion — Aisha & Priya",
  "Communication Analyzer with 7 C's scoring",
  "Unlimited speaking practice",
  "Progress charts, badges & priority replies",
];

const steps = [
  "Copy the UPI ID below.",
  "Open any UPI app and send ₹110 to this ID.",
  "Note your transaction ID / screenshot for activation.",
];

export default function BuyPremium() {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
    } catch {
      // Fallback for browsers that block the clipboard API.
      const input = document.createElement("textarea");
      input.value = UPI_ID;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(input);
    }
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-600 px-6 py-10 text-white shadow-2xl shadow-indigo-900/20 sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-2xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-200 ring-1 ring-white/20">
              <Crown className="h-3.5 w-3.5" />
              Premium plan
            </span>
            <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
              Unlock everything CommSkills has to offer.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-indigo-100 sm:text-lg">
              One simple upgrade for unlimited practice, AI-powered feedback and your
              personal AI companions.
            </p>

            <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div className="rounded-2xl bg-white/10 px-7 py-5 ring-1 ring-white/20 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
                  Monthly plan
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">{PRICE}</span>
                  <span className="text-indigo-200">/ month</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm font-medium">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                  <Zap className="h-4 w-4 text-amber-300" />
                  Instant access
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Secure UPI payment
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Included features */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">What's included</h2>
                <p className="text-xs text-slate-500">Everything in Free, plus more</p>
              </div>
            </div>
            <ul className="mt-6 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-xs font-medium text-amber-800">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              Best value — one subscription, every Premium feature.
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Smartphone className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pay with UPI</h2>
                <p className="text-xs text-slate-500">Send {PRICE} to the ID below</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">
                UPI ID
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-lg font-bold break-all text-slate-900 sm:text-xl">
                  {UPI_ID}
                </p>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-colors hover:bg-indigo-700"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy UPI ID"}
                </button>
              </div>
            </div>

            <ol className="mt-6 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <a
              href={`upi://pay?pa=${UPI_ID}&pn=CommSkills&am=110&cu=INR`}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-opacity hover:opacity-95"
            >
              <Smartphone className="h-4 w-4" />
              Open UPI app to pay {PRICE}
            </a>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Payments are not processed inside the app yet. Premium access is activated
                manually after your payment is verified.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
