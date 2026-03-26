import React from "react";
import { knowledgeBase } from "@/data/knowledgeBase";
import { MessageSquareText, Volume2 } from "lucide-react";

export default function Vocabulary() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold text-slate-900 mb-4">Vocabulary Builder</h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          A strong vocabulary helps you express complex ideas simply. Learn these powerful professional words.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {knowledgeBase.vocabulary.map((v, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-2xl text-indigo-700 capitalize">{v.word}</h2>
                <button className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed h-16">{v.meaning}</p>
              <div className="h-px w-full bg-slate-100 mb-4" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Example</p>
              <p className="text-sm text-slate-700 italic mt-1">
                "She gave an <span className="font-bold text-indigo-600">{v.word.toLowerCase()}</span> presentation to the board."
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
