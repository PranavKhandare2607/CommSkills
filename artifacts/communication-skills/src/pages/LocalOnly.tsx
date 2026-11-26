import { ArrowUpRight, Terminal } from "lucide-react";

export default function LocalOnly() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-300/30 bg-indigo-400/20">
            <Terminal className="h-5 w-5 text-indigo-200" />
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-300">GitHub Pages preview</p>
            <h1 className="text-2xl font-bold tracking-tight">Run CommSkills locally</h1>
          </div>
        </div>

        <p className="text-indigo-100/90 leading-relaxed">
          This hosted link is a preview only. Sign-in and the AI practice features need the local API, so
          please run the Docker stack on your computer and open the local app:
        </p>

        <div className="my-6 rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-sm text-indigo-100">
          <p>docker compose up -d --build</p>
          <a
            href="http://localhost:3000"
            className="mt-2 inline-flex items-center gap-1 text-indigo-300 hover:text-white"
          >
            http://localhost:3000 <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <p className="text-sm text-indigo-200/80">
          Login: <span className="font-mono text-white">testuser@example.com</span> /{" "}
          <span className="font-mono text-white">password123</span>
        </p>
      </div>
    </div>
  );
}
