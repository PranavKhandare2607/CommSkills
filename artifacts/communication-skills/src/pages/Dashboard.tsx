import React from "react";
import { motion } from "framer-motion";
import { Trophy, Target, Sparkles, Mic, Activity, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useGetProgress } from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: progress, isLoading } = useGetProgress();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const p = progress || {
    points: 0,
    badge: "Beginner",
    grammarAccuracy: 0,
    vocabularyLearned: 0,
    speakingAttempts: 0,
    recentActivity: [],
    grammarHistory: [],
    vocabularyHistory: []
  };

  const statCards = [
    { label: "Total Points", value: p.points.toLocaleString(), icon: Trophy, color: "text-amber-500", bg: "bg-amber-100", border: "border-amber-200" },
    { label: "Grammar Accuracy", value: `${p.grammarAccuracy.toFixed(1)}%`, icon: Target, color: "text-emerald-500", bg: "bg-emerald-100", border: "border-emerald-200" },
    { label: "Words Learned", value: p.vocabularyLearned, icon: Sparkles, color: "text-indigo-500", bg: "bg-indigo-100", border: "border-indigo-200" },
    { label: "Speaking Sessions", value: p.speakingAttempts, icon: Mic, color: "text-rose-500", bg: "bg-rose-100", border: "border-rose-200" },
  ];

  const safeGrammarHistory = p.grammarHistory?.length ? p.grammarHistory : [
    { name: "Mon", score: 0 }, { name: "Tue", score: 0 }, { name: "Wed", score: 0 }
  ];

  const safeVocabHistory = p.vocabularyHistory?.length ? p.vocabularyHistory : [
    { name: "Mon", score: 0 }, { name: "Tue", score: 0 }, { name: "Wed", score: 0 }
  ];

  return (
    <div className="p-6 md:p-10 pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Track your communication skills progress.</p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700">
            <span className="text-sm font-semibold">Current Rank:</span>
            <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full font-bold uppercase tracking-wider">{p.badge}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`bg-white rounded-2xl p-5 border ${stat.border} shadow-sm flex flex-col`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-auto">
                <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
                <p className="text-3xl font-display font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
          >
            <h3 className="text-lg font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" /> Grammar Accuracy Over Time
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeGrammarHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
          >
            <h3 className="text-lg font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Vocabulary Growth
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeVocabHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" /> Recent Activity
            </h3>
          </div>
          
          <div className="space-y-4">
            {p.recentActivity?.length > 0 ? (
              p.recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                    <div>
                      <p className="font-medium text-slate-900">{activity.description}</p>
                      <p className="text-xs text-slate-500 mt-1 capitalize">{activity.type} • {new Date(activity.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    <ArrowUpRight className="w-3 h-3" />
                    {activity.pointsEarned}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No activity yet. Start exploring the tools to earn points!</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
