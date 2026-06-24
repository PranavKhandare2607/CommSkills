import { Link } from "wouter";
import { BookOpen, Mic, Brain, MessageSquare, TrendingUp, Star } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  {
    icon: <Brain className="w-6 h-6 text-indigo-400" />,
    title: "AI Grammar Coach",
    desc: "Instant corrections with detailed explanations and accuracy scores.",
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-violet-400" />,
    title: "Buddy AI Chat",
    desc: "Practice conversations with your intelligent AI coach anytime.",
  },
  {
    icon: <Mic className="w-6 h-6 text-pink-400" />,
    title: "Speaking Practice",
    desc: "Live transcription and real-time feedback on your spoken English.",
  },
  {
    icon: <BookOpen className="w-6 h-6 text-emerald-400" />,
    title: "7 C's Framework",
    desc: "Master the principles of effective communication with guided quizzes.",
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-amber-400" />,
    title: "Track Progress",
    desc: "Visualize your growth with charts, badges, and activity history.",
  },
  {
    icon: <Star className="w-6 h-6 text-rose-400" />,
    title: "AI Companion",
    desc: "Aisha or Priya — your personal AI coach in English, Hindi, or Hinglish.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white">
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-400/30 border border-indigo-400/40 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">CommSkills</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="px-4 py-2 text-sm text-indigo-200 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 text-sm font-medium bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-4 py-1.5 text-sm text-indigo-200 mb-8">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            AI-Powered Communication Training
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Speak. Write. Lead.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300">
              Communicate Better.
            </span>
          </h1>
          <p className="text-indigo-200 text-xl max-w-2xl mx-auto mb-10">
            CommSkills uses AI to help you master grammar, expand your vocabulary, refine your speaking, and communicate with confidence — in English, Hindi, or Hinglish.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-500 hover:bg-indigo-400 rounded-xl font-semibold text-white transition-colors text-center"
            >
              Start Learning Free
            </Link>
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold text-white transition-colors text-center"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-indigo-200 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-indigo-300 text-sm">
        © {new Date().getFullYear()} CommSkills — AI Communication Coach
      </footer>
    </div>
  );
}
