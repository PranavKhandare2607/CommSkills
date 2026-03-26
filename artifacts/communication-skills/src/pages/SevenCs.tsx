import React from "react";
import { knowledgeBase } from "@/data/knowledgeBase";
import { CheckCircle2 } from "lucide-react";

export default function SevenCs() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold text-slate-900 mb-4">The 7 C's of Communication</h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          The 7 C's provide a checklist for making sure that your meetings, emails, conference calls, reports, and presentations are well constructed and clear.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {knowledgeBase.sevenCs.map((c, i) => (
          <div 
            key={i} 
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-indigo-700 text-lg">{i + 1}</span>
              </div>
              <h2 className="font-display font-bold text-xl text-slate-900">{c.name}</h2>
            </div>
            <p className="text-slate-600 pl-13 leading-relaxed">{c.description}</p>
            <div className="mt-4 pl-13 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-500 italic">Try applying this to your next important email.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
