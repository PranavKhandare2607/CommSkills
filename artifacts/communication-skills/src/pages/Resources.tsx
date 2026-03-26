import React from "react";
import { motion } from "framer-motion";
import { Library, FileText, Download, Mail, Presentation, MessageSquare, CheckCircle } from "lucide-react";

const RESOURCES = [
  { title: "Active Listening Cheat Sheet", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50" },
  { title: "7 C's Quick Reference", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  { title: "Email Templates", icon: Mail, color: "text-indigo-500", bg: "bg-indigo-50" },
  { title: "Interview Preparation Guide", icon: FileText, color: "text-rose-500", bg: "bg-rose-50" },
  { title: "Grammar Rules Cheatsheet", icon: FileText, color: "text-amber-500", bg: "bg-amber-50" },
  { title: "Public Speaking Tips", icon: Presentation, color: "text-violet-500", bg: "bg-violet-50" },
];

export default function Resources() {
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        <div className="mb-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-900 flex items-center justify-center shadow-lg">
            <Library className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Resources</h1>
            <p className="text-slate-500 mt-1 text-lg">Downloadable guides and templates for daily use.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {RESOURCES.map((res, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group flex flex-col items-center text-center cursor-pointer"
            >
              <div className={`w-16 h-16 rounded-full ${res.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <res.icon className={`w-8 h-8 ${res.color}`} />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-900 mb-6">{res.title}</h3>
              <button className="w-full mt-auto py-2.5 rounded-xl font-semibold bg-slate-50 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center gap-2 border border-slate-200 group-hover:border-transparent">
                <Download className="w-4 h-4" /> View Resource
              </button>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}
