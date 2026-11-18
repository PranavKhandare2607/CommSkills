import React from "react";
import { Link } from "wouter";
import { ArrowRight, Sparkles, BookOpen, Presentation, Mail, PenTool } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const features = [
  { title: "AI Assistant", desc: "Get real-time feedback and rewrite suggestions.", icon: Sparkles, color: "text-indigo-600", bg: "bg-indigo-100", link: "/ai-assistant" },
  { title: "7 C's of Comm", desc: "Master the 7 foundational principles of clear writing.", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-100", link: "/seven-cs" },
  { title: "Grammar Tips", desc: "Fix common mistakes and learn essential rules.", icon: PenTool, color: "text-amber-600", bg: "bg-amber-100", link: "/grammar" },
  { title: "Interview Prep", desc: "Ace your next job interview with proven strategies.", icon: Presentation, color: "text-rose-600", bg: "bg-rose-100", link: "/interview" },
  { title: "Email Writing", desc: "Templates and tips for professional correspondence.", icon: Mail, color: "text-blue-600", bg: "bg-blue-100", link: "/email" }
];

export default function Home() {
  return (
    <div className="pb-12">
      {/* Hero Section */}
      <div className="relative w-full h-[320px] md:h-[400px] overflow-hidden rounded-b-[2.5rem]">
        <img 
          src={`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}images/hero-bg.png`} 
          alt="Abstract Hero Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/40" />
        
        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-20 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold tracking-wider uppercase mb-4 backdrop-blur-sm">
              Level Up Your Career
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-2xl">
              Master the Art of <span className="text-indigo-400">Communication</span>
            </h1>
            <p className="mt-4 text-lg text-slate-300 max-w-xl">
              Improve your writing, speaking, and professional presence with your personal AI communication coach.
            </p>
            
            <div className="mt-8 flex items-center gap-4">
              <Link href="/ai-coach">
                <button className="px-6 py-3 rounded-xl font-semibold bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Chat with AI Coach
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modules Section */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 mt-12 md:mt-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Learning Modules</h2>
            <p className="text-slate-500 mt-1">Explore our comprehensive guides and tools.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link href={feature.link}>
                <div className="h-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group cursor-pointer">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", feature.bg, feature.color)}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm mb-6">{feature.desc}</p>
                  <div className="flex items-center text-sm font-semibold text-indigo-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    Explore <ArrowRight className="ml-1 w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
