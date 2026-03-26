import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Search, Volume2, BookA, BookmarkPlus } from "lucide-react";
import { useLookupVocabulary, useUpdateProgress } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProgressQueryKey } from "@workspace/api-client-react";

export default function Vocabulary() {
  const [word, setWord] = useState("");
  const { mutate: lookup, data: result, isPending } = useLookupVocabulary();
  const { mutate: updateProgress } = useUpdateProgress();
  const queryClient = useQueryClient();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    
    lookup({ data: { word: word.trim() } }, {
      onSuccess: (res) => {
        if (res.found) {
          updateProgress({
            data: {
              type: "vocabulary",
              description: `Learned word: ${res.word}`,
              pointsEarned: 5
            }
          }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() })
          });
        }
      }
    });
  };

  const playPronunciation = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 mb-4">
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900">Word Practice</h1>
          <p className="text-slate-500 mt-3 text-lg">Expand your vocabulary with definitions, pronunciation, and contextual examples.</p>
        </div>

        <form onSubmit={handleSearch} className="mb-12 relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Enter a word to look up..."
            className="w-full pl-12 pr-32 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={isPending || !word.trim()}
            className="absolute inset-y-2 right-2 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {isPending ? "..." : "Look Up"}
          </button>
        </form>

        {result && result.found && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white rounded-3xl p-8 md:p-10 border border-amber-100 shadow-xl shadow-amber-500/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10"></div>
            
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-5xl font-display font-bold text-slate-900 capitalize">{result.word}</h2>
              <div className="bg-amber-100 text-amber-700 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                <BookmarkPlus className="w-3 h-3"/> +5 Pts
              </div>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <span className="text-slate-500 text-lg font-mono">{result.pronunciation}</span>
              <button 
                onClick={() => playPronunciation(result.word)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                title="Listen to pronunciation"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {result.definitions.map((def, i) => (
                <div key={i} className="border-l-4 border-amber-400 pl-4 py-1">
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded mb-2">
                    {def.partOfSpeech}
                  </span>
                  <p className="text-slate-800 text-lg font-medium mb-2">{def.definition}</p>
                  {def.example && (
                    <p className="text-slate-500 italic flex gap-2">
                      <span className="text-amber-400 font-serif">"</span>
                      {def.example}
                      <span className="text-amber-400 font-serif">"</span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            {(result.synonyms.length > 0 || result.antonyms.length > 0) && (
              <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.synonyms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Synonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.synonyms.map(s => (
                        <span key={s} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-100">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.antonyms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Antonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.antonyms.map(a => (
                        <span key={a} className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-100">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {result && !result.found && (
          <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200">
            <BookA className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Word not found. Try checking the spelling.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
