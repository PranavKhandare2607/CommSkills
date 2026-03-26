import React from "react";
import { knowledgeBase } from "@/data/knowledgeBase";
import { Mail, ArrowRight } from "lucide-react";

export default function EmailWriting() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-6">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="font-display text-4xl font-bold text-slate-900 mb-4">Professional Emails</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Learn how to write clear, concise, and professional emails that get responses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {knowledgeBase.emailWriting.map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-2">{item.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>

      {/* Example Template */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs font-medium text-slate-400 ml-4 font-mono">New Message</span>
        </div>
        <div className="p-6 md:p-8 text-slate-300 font-sans space-y-4">
          <div className="flex border-b border-slate-700 pb-2">
            <span className="text-slate-500 w-16">To:</span>
            <span className="text-indigo-400">colleague@company.com</span>
          </div>
          <div className="flex border-b border-slate-700 pb-2">
            <span className="text-slate-500 w-16">Subject:</span>
            <span className="text-white font-medium">Action Required: Q3 Marketing Report Review</span>
          </div>
          <div className="pt-4 space-y-4 text-sm leading-relaxed">
            <p>Hi Sarah,</p>
            <p>I hope this email finds you well.</p>
            <p>I have attached the draft for the Q3 Marketing Report. Could you please review the metrics section on page 4?</p>
            <p className="bg-slate-800 p-3 rounded-lg border-l-2 border-indigo-500">
              <span className="font-bold text-white">Call to Action:</span> Please provide your feedback by Friday EOD so we can finalize the presentation for Monday.
            </p>
            <p>Let me know if you need any clarification.</p>
            <p>Best regards,<br/>Alex</p>
          </div>
        </div>
      </div>
    </div>
  );
}
