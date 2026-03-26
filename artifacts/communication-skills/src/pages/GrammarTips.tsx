import React from "react";
import { knowledgeBase } from "@/data/knowledgeBase";
import { PenTool, ArrowRight } from "lucide-react";

export default function GrammarTips() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      <div className="mb-12 flex items-center gap-4">
        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
          <PenTool className="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold text-slate-900">Grammar Masterclass</h1>
          <p className="text-slate-600 mt-2">Elevate your writing with these essential rules.</p>
        </div>
      </div>

      <div className="space-y-6">
        {knowledgeBase.grammarRules.map((rule, i) => (
          <div key={i} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-display font-bold text-xl text-slate-900 mb-3">{rule.title}</h2>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-slate-700 leading-relaxed">{rule.text}</p>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-amber-600 hover:text-amber-700 cursor-pointer">
              Practice in AI Assistant <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
