import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard,
  Bot,
  BarChart3,
  CheckSquare,
  BookOpen,
  Mic,
  Sparkles,
  Library,
  Heart,
  Menu, 
  X,
  Trophy,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useGetProgress } from "@workspace/api-client-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-coach", label: "AI Coach", icon: Bot, isPrimary: true },
  { href: "/analyzer", label: "Communication Analyzer", icon: BarChart3 },
  { href: "/grammar", label: "Grammar Tool", icon: CheckSquare },
  { href: "/sevens", label: "7 C's of Comm", icon: BookOpen },
  { href: "/talk", label: "Speaking Practice", icon: Mic },
  { href: "/word", label: "Word Practice", icon: Sparkles },
  { href: "/companion", label: "AI Companion", icon: Heart, isPrimary: true },
  { href: "/resources", label: "Resources", icon: Library },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: progress } = useGetProgress();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-indigo-950 border-r border-indigo-900/50 shadow-xl z-20 text-indigo-100 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-indigo-900/50">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white leading-tight">CommSkills</h1>
            <p className="text-xs text-indigo-300 font-medium">Elevate your skills</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto sidebar-scrollbar">
          <div className="mb-4 px-2">
            <p className="text-xs font-semibold text-indigo-400/70 uppercase tracking-wider">Menu</p>
          </div>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer group",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" 
                      : "text-indigo-200 hover:bg-indigo-900 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors", 
                    isActive ? "text-white" : "text-indigo-400 group-hover:text-indigo-300",
                    item.isPrimary && !isActive && "text-indigo-400"
                  )} />
                  {item.label}
                  {item.isPrimary && !isActive && (
                    <span className="ml-auto flex h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-5 border-t border-indigo-900/50 bg-indigo-950/50">
          <div className="bg-indigo-900/40 rounded-xl p-4 border border-indigo-800/50 flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-colors"></div>
            <div className="flex items-center gap-2 text-indigo-100">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-sm">{progress?.points?.toLocaleString() || 0} pts</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs">
              <Star className="w-3.5 h-3.5" />
              <span>Rank: <strong className="text-indigo-100">{progress?.badge || "Beginner"}</strong></span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-indigo-950 border-b border-indigo-900 z-20 text-white shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-display font-bold text-lg text-white">CommSkills</h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-indigo-900 text-indigo-100 hover:bg-indigo-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-[280px] max-w-sm bg-indigo-950 shadow-2xl z-50 flex flex-col md:hidden text-indigo-100 border-l border-indigo-900"
              >
                <div className="p-4 flex items-center justify-between border-b border-indigo-900/50">
                  <h2 className="font-display font-bold text-lg text-white">Menu</h2>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-indigo-300 hover:bg-indigo-900 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-1.5 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                            isActive 
                              ? "bg-indigo-600 text-white" 
                              : "text-indigo-200 hover:bg-indigo-900"
                          )}
                        >
                          <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-indigo-400")} />
                          {item.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                
                <div className="mt-auto p-5 border-t border-indigo-900/50">
                  <div className="bg-indigo-900/40 rounded-xl p-4 border border-indigo-800/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-indigo-100">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-sm">{progress?.points?.toLocaleString() || 0} pts</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-slate-50">
          <div className="h-full w-full mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
