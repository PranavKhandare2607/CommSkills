import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  MessageSquareText, 
  BookOpen, 
  PenTool, 
  BriefcaseBusiness, 
  Mail, 
  Library, 
  Menu, 
  X,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: Library },
  { href: "/ai-assistant", label: "AI Assistant", icon: Sparkles, isPrimary: true },
  { href: "/seven-cs", label: "7C's of Comm", icon: BookOpen },
  { href: "/grammar", label: "Grammar Tips", icon: PenTool },
  { href: "/vocabulary", label: "Vocabulary", icon: MessageSquareText },
  { href: "/interview", label: "Interview Tips", icon: BriefcaseBusiness },
  { href: "/email", label: "Email Writing", icon: Mail },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 shadow-sm z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-900 leading-tight">CommCoach</h1>
            <p className="text-xs text-slate-500 font-medium">Elevate your skills</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4 px-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</p>
          </div>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer group",
                    isActive 
                      ? (item.isPrimary 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                          : "bg-indigo-50 text-indigo-700") 
                      : (item.isPrimary 
                          ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && item.isPrimary ? "text-indigo-100" : (isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"))} />
                  {item.label}
                  {item.isPrimary && !isActive && (
                    <span className="ml-auto flex h-2 w-2 rounded-full bg-indigo-600"></span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm font-medium text-slate-900">Keep learning!</p>
            <p className="text-xs text-slate-500 mt-1">Practice makes perfect.</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-display font-bold text-lg text-slate-900">CommCoach</h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-4/5 max-w-sm bg-white shadow-2xl z-50 flex flex-col md:hidden"
              >
                <div className="p-4 flex items-center justify-between border-b border-slate-100">
                  <h2 className="font-display font-bold text-lg">Menu</h2>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-2 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                            isActive 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-100" : "text-slate-400")} />
                          {item.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
