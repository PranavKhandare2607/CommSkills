import React from "react";
import { knowledgeBase } from "@/data/knowledgeBase";
import { BriefcaseBusiness, Star } from "lucide-react";

export default function InterviewTips() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-8 md:p-12 mb-12 text-white shadow-xl">
        <BriefcaseBusiness className="w-12 h-12 text-indigo-400 mb-6" />
        <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">Interview Success Guide</h1>
        <p className="text-indigo-100 text-lg max-w-xl">
          Nail your next interview by preparing thoroughly and communicating with confidence.
        </p>
      </div>

      <div className="space-y-6">
        {knowledgeBase.interviewTips.map((tip, i) => (
          <div key={i} className="flex gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
            <div className="shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                <Star className="w-4 h-4 text-rose-600" />
              </div>
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900 mb-2">{tip.title}</h2>
              <p className="text-slate-600 leading-relaxed">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
