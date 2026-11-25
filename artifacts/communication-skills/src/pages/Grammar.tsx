import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckSquare, ArrowRight, Lightbulb, CheckCircle2 } from "lucide-react";
import { useCheckGrammar, useUpdateProgress } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProgressQueryKey } from "@workspace/api-client-react";

export default function Grammar() {
  const [text, setText] = useState("");
  const [hasScored, setHasScored] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: checkGrammar, data: result, isPending } = useCheckGrammar();
  const { mutate: updateProgress } = useUpdateProgress();

  const handleCheck = () => {
    if (!text.trim()) return;
    checkGrammar(
      { data: { text } },
      {
        onSuccess: (res) => {
          if (!hasScored) {
            updateProgress({
              data: {
                type: "grammar",
                description: "Completed a Grammar Check session",
                pointsEarned: 10,
                accuracy: res.score
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

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-emerald-600" />
              </div>
              Grammar Tool
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Fix common mistakes and learn essential rules.</p>
          </div>
          {hasScored && (
             <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 animate-pulse">
               +10 Points Earned!
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-semibold text-slate-700 mb-3">Original Text</h3>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your text here to check for grammar mistakes..."
              className="w-full flex-1 min-h-[200px] p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 text-slate-800 transition-all custom-scrollbar"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCheck}
                disabled={!text.trim() || isPending}
                className="px-6 py-3 rounded-xl font-semibold bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isPending ? "Checking..." : <><CheckSquare className="w-5 h-5" /> Check Grammar</>}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              Corrected Text <ArrowRight className="w-4 h-4 text-slate-400" />
            </h3>
            
            {result ? (
              <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {result.corrected}
              </div>
            ) : (
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-center text-slate-400 text-center flex-col">
                <Lightbulb className="w-10 h-10 mb-2 opacity-50" />
                <p>Run the check to see your corrected text here.</p>
              </div>
            )}
          </div>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <h3 className="text-slate-500 font-semibold uppercase tracking-wider text-sm mb-4">Accuracy Score</h3>
              <div className="text-5xl font-display font-bold text-slate-900 mb-2">
                <span className={result.score >= 80 ? "text-emerald-500" : result.score >= 60 ? "text-amber-500" : "text-rose-500"}>
                  {result.score}
                </span>
                <span className="text-2xl text-slate-400">/100</span>
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Explanation & Improvements</h3>
              <p className="text-slate-700 bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4">
                {result.explanation}
              </p>
              
              {Array.isArray(result.improvements) && result.improvements.length > 0 && (
                <ul className="space-y-2">
                  {result.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span className="text-slate-600">{imp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
