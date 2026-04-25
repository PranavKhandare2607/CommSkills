import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Activity, Target, Zap } from "lucide-react";
import { useSaveSpeakingSession, useUpdateProgress } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProgressQueryKey } from "@workspace/api-client-react";

export default function Talk() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [hasScored, setHasScored] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const recognitionRef = useRef<any>(null);
  
  const queryClient = useQueryClient();
  const { mutate: saveSession, data: result, isPending } = useSaveSpeakingSession();
  const { mutate: updateProgress } = useUpdateProgress();

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript("");
      setHasScored(false);
      setStartTime(Date.now());
    };
    
    recognition.onresult = (event: any) => {
      let finalStr = '';
      for (let i = 0; i < event.results.length; ++i) {
        finalStr += event.results[i][0].transcript;
      }
      setTranscript(finalStr);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
  };

  const handleAnalyze = () => {
    if (!transcript) return;
    const words = transcript.trim().split(/\s+/).length;
    const duration = startTime > 0 ? Math.max(1, Math.round((Date.now() - startTime) / 1000)) : 30;
    
    saveSession({
      data: { transcript, wordCount: words, duration }
    }, {
      onSuccess: (res) => {
        if (!hasScored) {
          updateProgress({
            data: {
              type: "speaking",
              description: `Completed a speaking session (${words} words)`,
              pointsEarned: res.pointsEarned ?? 10,
              accuracy: res.clarityScore
            }
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() });
              setHasScored(true);
            }
          });
        }
      }
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-display font-bold text-slate-900 mb-3">Think Fast, Talk Smart</h1>
          <p className="text-slate-500 text-lg">Record yourself and get instant feedback on clarity, pacing, and word choice.</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center mb-8 relative overflow-hidden">
          {/* Animated Background for Recording */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <div className="w-64 h-64 bg-rose-500 rounded-full blur-3xl animate-pulse"></div>
            </div>
          )}

          <button
            onClick={toggleRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all z-10 ${
              isRecording 
                ? 'bg-rose-500 shadow-rose-500/30 scale-110 animate-pulse' 
                : 'bg-indigo-600 shadow-indigo-600/30 hover:scale-105 hover:bg-indigo-700'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-10 h-10" />}
          </button>
          
          <p className="mt-6 font-medium text-slate-600">
            {isRecording ? "Listening... Click to stop" : "Press start to begin speaking"}
          </p>

          <div className="w-full mt-8 bg-slate-50 border border-slate-100 rounded-2xl p-6 min-h-[150px]">
            {transcript ? (
              <p className="text-slate-800 text-lg leading-relaxed">{transcript}</p>
            ) : (
              <p className="text-slate-400 text-center italic">Your words will appear here...</p>
            )}
          </div>

          {!isRecording && transcript && !hasScored && (
            <button
              onClick={handleAnalyze}
              disabled={isPending}
              className="mt-6 px-8 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg"
            >
              {isPending ? "Analyzing..." : "Analyze Recording"}
            </button>
          )}
        </div>

        {result && hasScored && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-white rounded-2xl p-6 border border-rose-100 shadow-sm flex flex-col items-center text-center">
              <Activity className="w-8 h-8 text-rose-500 mb-3" />
              <p className="text-3xl font-display font-bold text-slate-900">{result.wordCount}</p>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Words Spoken</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm flex flex-col items-center text-center">
              <Target className="w-8 h-8 text-emerald-500 mb-3" />
              <p className="text-3xl font-display font-bold text-slate-900">{result.clarityScore}%</p>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Clarity Score</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm flex flex-col items-center text-center relative">
              <div className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-md">+{result.pointsEarned} pts</div>
              <Zap className="w-8 h-8 text-amber-500 mb-3" />
              <p className="text-3xl font-display font-bold text-slate-900">{result.pacingScore}%</p>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Pacing Score</p>
            </div>

            <div className="md:col-span-3 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">AI Feedback</h3>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {result.feedback}
              </p>
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
