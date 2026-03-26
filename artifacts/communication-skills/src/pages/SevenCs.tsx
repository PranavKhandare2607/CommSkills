import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Target, Scissors, Layers, CheckCircle, Link2, ListChecks, HeartHandshake, X } from "lucide-react";
import { useLocation } from "wouter";
import { useUpdateProgress } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProgressQueryKey } from "@workspace/api-client-react";

const PRINCIPLES = [
  { id: "clear", title: "Clear", icon: Target, color: "text-blue-500", bg: "bg-blue-100", border: "border-blue-200", desc: "Making the message easy to understand and clear in meaning. Avoid complex words and passive voice." },
  { id: "concise", title: "Concise", icon: Scissors, color: "text-emerald-500", bg: "bg-emerald-100", border: "border-emerald-200", desc: "Using only necessary words. Remove filler words and redundant phrases." },
  { id: "concrete", title: "Concrete", icon: Layers, color: "text-amber-500", bg: "bg-amber-100", border: "border-amber-200", desc: "Using specific facts and figures. Avoid vague statements." },
  { id: "correct", title: "Correct", icon: CheckCircle, color: "text-rose-500", bg: "bg-rose-100", border: "border-rose-200", desc: "Using proper grammar, punctuation, and spelling. Ensuring facts are accurate." },
  { id: "coherent", title: "Coherent", icon: Link2, color: "text-indigo-500", bg: "bg-indigo-100", border: "border-indigo-200", desc: "Making the message logical and consistent. Ideas should flow naturally." },
  { id: "complete", title: "Complete", icon: ListChecks, color: "text-cyan-500", bg: "bg-cyan-100", border: "border-cyan-200", desc: "Including all necessary information. Answer who, what, when, where, why." },
  { id: "courteous", title: "Courteous", icon: HeartHandshake, color: "text-violet-500", bg: "bg-violet-100", border: "border-violet-200", desc: "Being polite and professional. Considering the reader's perspective." },
];

const QUIZZES: Record<string, any> = {
  clear: { q: "Which sentence shows better clarity?", options: ["The utilization of the new system will commence tomorrow.", "We will start using the new system tomorrow."], answer: 1 },
  concise: { q: "Which is more concise?", options: ["At this point in time, we are currently working on it.", "We are working on it now."], answer: 1 },
  concrete: { q: "Which statement is concrete?", options: ["Sales went up a lot last quarter.", "Sales increased by 15% in Q3."], answer: 1 },
  correct: { q: "Which sentence is grammatically correct?", options: ["Their going to the store.", "They're going to the store."], answer: 1 },
  coherent: { q: "What makes a paragraph coherent?", options: ["Using big words.", "Using transitional words like 'therefore' and 'however'."], answer: 1 },
  complete: { q: "A complete email should include:", options: ["Only the main point.", "Who, what, when, where, and why/how."], answer: 1 },
  courteous: { q: "Which opening is more courteous?", options: ["Send me the report now.", "Could you please send me the report when you have a moment?"], answer: 1 },
};

export default function SevenCs() {
  const [, setLocation] = useLocation();
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const { mutate: updateProgress } = useUpdateProgress();
  const queryClient = useQueryClient();

  const handleOptionSelect = (idx: number) => {
    setSelectedOption(idx);
    const quiz = QUIZZES[activeQuiz!];
    if (idx === quiz.answer) {
      updateProgress({
        data: {
          type: "quiz",
          description: `Completed 7C Quiz: ${PRINCIPLES.find(p=>p.id===activeQuiz)?.title}`,
          pointsEarned: 5
        }
      }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() })
      });
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              7 C's of Communication
            </h1>
            <p className="text-slate-500 mt-2 text-lg max-w-2xl">Master the foundational principles of effective professional communication.</p>
          </div>
          <button
            onClick={() => setLocation("/ai-coach")}
            className="px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-medium border border-indigo-200 transition-colors shrink-0"
          >
            Ask Buddy to explain further →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {PRINCIPLES.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white rounded-2xl p-6 border ${p.border} shadow-sm hover:shadow-md transition-shadow flex flex-col h-full`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center shrink-0`}>
                  <p.icon className={`w-5 h-5 ${p.color}`} />
                </div>
                <h2 className="text-xl font-display font-bold text-slate-900">{p.title}</h2>
              </div>
              <p className="text-slate-600 mb-6 flex-1">{p.desc}</p>
              <button
                onClick={() => { setActiveQuiz(p.id); setSelectedOption(null); }}
                className="w-full py-2.5 rounded-xl font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                Quick Quiz
              </button>
            </motion.div>
          ))}
        </div>

      </motion.div>

      {/* Quiz Modal */}
      <AnimatePresence>
        {activeQuiz && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setActiveQuiz(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-display font-bold text-slate-800">Knowledge Check</h3>
                <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6">
                <p className="text-lg font-medium text-slate-900 mb-6">{QUIZZES[activeQuiz].q}</p>
                <div className="space-y-3">
                  {QUIZZES[activeQuiz].options.map((opt: string, idx: number) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === QUIZZES[activeQuiz].answer;
                    const showResult = selectedOption !== null;
                    
                    let btnClass = "bg-white border-slate-200 hover:border-indigo-300 text-slate-700";
                    if (showResult) {
                      if (isCorrect) btnClass = "bg-emerald-50 border-emerald-500 text-emerald-800";
                      else if (isSelected) btnClass = "bg-rose-50 border-rose-500 text-rose-800";
                      else btnClass = "opacity-50 border-slate-200";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={showResult}
                        onClick={() => handleOptionSelect(idx)}
                        className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${btnClass}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {selectedOption !== null && (
                  <div className={`mt-6 p-4 rounded-xl text-center font-bold ${selectedOption === QUIZZES[activeQuiz].answer ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {selectedOption === QUIZZES[activeQuiz].answer ? 'Correct! +5 points' : 'Incorrect. Try again later!'}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
