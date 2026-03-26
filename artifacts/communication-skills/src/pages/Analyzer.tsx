import React, { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, AlertCircle, ArrowUpRight, Zap } from "lucide-react";
import { useAnalyzeCommunication, useUpdateProgress } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProgressQueryKey } from "@workspace/api-client-react";

export default function Analyzer() {
  const [text, setText] = useState("");
  const [hasScored, setHasScored] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: analyze, data: result, isPending } = useAnalyzeCommunication();
  const { mutate: updateProgress } = useUpdateProgress();

  const handleAnalyze = () => {
    if (!text.trim()) return;
    analyze(
      { data: { text } },
      {
        onSuccess: (res) => {
          if (!hasScored) {
            updateProgress({
              data: {
                type: "analyzer",
                description: "Used Communication Analyzer",
                pointsEarned: 10,
                accuracy: res.overallScore
              }
            }, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() });
                setHasScored(true);
              }
            });
          }
        }
      }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-500 bg-amber-50 border-amber-200";
    return "text-rose-500 bg-rose-50 border-rose-200";
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            Communication Analyzer
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Score your emails and messages for clarity, conciseness, and professional courtesy.</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your email, message, or text here to analyze..."
            className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 text-slate-800 transition-all custom-scrollbar"
          />
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">
              {text.length} characters
            </span>
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || isPending}
              className="px-6 py-3 rounded-xl font-semibold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isPending ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Analyzing...</>
              ) : (
                <><Zap className="w-5 h-5" /> Analyze Message</>
              )}
            </button>
          </div>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* Overall Score */}
              <div className="md:w-1/3 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                {hasScored && (
                  <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 animate-bounce">
                    <ArrowUpRight className="w-3 h-3" /> +10 points
                  </div>
                )}
                <h3 className="text-slate-500 font-semibold uppercase tracking-wider text-sm mb-4">Overall Score</h3>
                <div className={`w-32 h-32 rounded-full flex items-center justify-center border-[8px] ${getScoreColor(result.overallScore)}`}>
                  <span className="text-4xl font-display font-bold">{result.overallScore}</span>
                </div>
                <p className="mt-4 font-medium text-slate-700">{result.feedback}</p>
              </div>

              {/* Dimension Scores */}
              <div className="md:w-2/3 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {[
                  { label: "Clarity", score: result.clarityScore },
                  { label: "Conciseness", score: result.conciseness },
                  { label: "Concreteness", score: result.concreteness },
                  { label: "Correctness", score: result.correctness },
                  { label: "Courtesy", score: result.courtesy },
                  { label: "Grammar", score: result.grammarScore },
                ].map((dim) => (
                  <div key={dim.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-700">{dim.label}</span>
                      <span className="font-bold text-slate-900">{dim.score}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${dim.score}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-2.5 rounded-full ${getBarColor(dim.score)}`}
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvements */}
            {result.improvements.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-lg font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" /> Room for Improvement
                </h3>
                <ul className="space-y-3">
                  {result.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5"><CheckCircle2 className="w-5 h-5 text-indigo-500" /></div>
                      <span className="text-slate-700 leading-relaxed">{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
