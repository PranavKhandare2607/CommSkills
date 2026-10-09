import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  Lightbulb,
  MessageCircle,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProgressQueryKey, useUpdateProgress } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GameId = "reply-right" | "seven-cs" | "word-blitz";

interface GameQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface GameDefinition {
  id: GameId;
  title: string;
  subtitle: string;
  description: string;
  questions: GameQuestion[];
  accent: string;
  icon: typeof MessageCircle;
}

const GAMES: GameDefinition[] = [
  {
    id: "reply-right",
    title: "Reply Right",
    subtitle: "Professional responses",
    description: "Choose a clear, respectful response for everyday work situations.",
    accent: "violet",
    icon: MessageCircle,
    questions: [
      {
        prompt: "Your manager asks for a draft that will be late. What is the best reply?",
        options: [
          "I’m behind on the draft and expect to send it by 3 PM. I’ll share an update at noon.",
          "It’s not ready yet. I have been very busy.",
          "I’ll send it soon.",
          "You gave me too much work, so it’s late.",
        ],
        answer: 0,
        explanation: "State the status, give a realistic time, and offer a useful update.",
      },
      {
        prompt: "A teammate gives you specific feedback. How should you respond?",
        options: [
          "That’s wrong; I already checked it.",
          "Thanks for flagging that. Can you point me to the example so I can fix it?",
          "Okay.",
          "I’ll ignore it for now.",
        ],
        answer: 1,
        explanation: "Acknowledge the feedback and ask for the detail you need to act on it.",
      },
      {
        prompt: "You join a meeting late. What is the most professional response?",
        options: [
          "Start again; I missed the beginning.",
          "I’m sorry for the delay. I’ll review what I missed and follow up on the agenda item.",
          "My last meeting ran over, so this is not my fault.",
          "Say nothing and interrupt when you need context.",
        ],
        answer: 1,
        explanation: "Apologize briefly, avoid derailing the meeting, and take responsibility for catching up.",
      },
      {
        prompt: "A request is too vague for you to begin. What should you say?",
        options: [
          "This makes no sense.",
          "I can take this on. What outcome, deadline, and priority should I work to?",
          "I’ll guess what you mean.",
          "Please send a complete brief before contacting me again.",
        ],
        answer: 1,
        explanation: "A neutral, focused question gets the missing information without blame.",
      },
      {
        prompt: "You disagree with a teammate’s proposal. What is the best way to raise it?",
        options: [
          "That will never work.",
          "I see a different risk. Could we compare the evidence before choosing?",
          "You are making the wrong decision.",
          "Say nothing and complain to someone else later.",
        ],
        answer: 1,
        explanation: "Describe the concern without attacking the person, then suggest a constructive next step.",
      },
    ],
  },
  {
    id: "seven-cs",
    title: "7 C’s Quick Challenge",
    subtitle: "Communication essentials",
    description: "Match each communication situation to the principle that improves it.",
    accent: "blue",
    icon: Lightbulb,
    questions: [
      {
        prompt: "A message is easy to understand on the first read. Which C is strongest?",
        options: ["Correct", "Clear", "Courteous", "Complete"],
        answer: 1,
        explanation: "Clear communication uses direct wording and a logical order.",
      },
      {
        prompt: "You remove repeated details so a busy reader can scan the message. Which C?",
        options: ["Concise", "Concrete", "Correct", "Coherent"],
        answer: 0,
        explanation: "Concise writing keeps the necessary information and removes the extra.",
      },
      {
        prompt: "You replace “soon” with “by 2 PM on Thursday.” Which C?",
        options: ["Courteous", "Complete", "Concrete", "Clear"],
        answer: 2,
        explanation: "Concrete details make a message specific and measurable.",
      },
      {
        prompt: "You check names, dates, figures, and grammar before sending. Which C?",
        options: ["Correct", "Concise", "Coherent", "Courteous"],
        answer: 0,
        explanation: "Correct communication is accurate and follows accepted language conventions.",
      },
      {
        prompt: "Every point supports the main purpose and the ideas flow in order. Which C?",
        options: ["Complete", "Coherent", "Concrete", "Courteous"],
        answer: 1,
        explanation: "Coherent communication connects its ideas in a logical sequence.",
      },
      {
        prompt: "Your update includes the decision, owner, deadline, and next step. Which C?",
        options: ["Clear", "Correct", "Complete", "Concise"],
        answer: 2,
        explanation: "Complete communication gives the audience the information needed to act.",
      },
      {
        prompt: "You disagree while staying respectful and considerate. Which C?",
        options: ["Courteous", "Concrete", "Coherent", "Complete"],
        answer: 0,
        explanation: "Courteous communication respects the audience, even when opinions differ.",
      },
    ],
  },
  {
    id: "word-blitz",
    title: "Word Blitz",
    subtitle: "Clearer word choices",
    description: "Pick the more precise, confident wording for a professional conversation.",
    accent: "emerald",
    icon: Trophy,
    questions: [
      {
        prompt: "Which phrase gives a specific commitment?",
        options: ["I’ll do it sometime.", "I’ll send the revised file by 4 PM today."],
        answer: 1,
        explanation: "A clear action and deadline set a reliable expectation.",
      },
      {
        prompt: "Which sentence sounds confident without overstating?",
        options: ["I might possibly be able to help.", "I can help with the first draft."],
        answer: 1,
        explanation: "Direct wording is easier to understand and sounds more confident.",
      },
      {
        prompt: "Which update is more useful to your team?",
        options: ["The launch task is going well.", "The test passed; I’m fixing one issue before launch."],
        answer: 1,
        explanation: "A concrete status and next action help people understand what is happening.",
      },
      {
        prompt: "Which is the more constructive way to ask for help?",
        options: ["I’m stuck on the report. Could you review the outline with me?", "I can’t do this. Someone needs to fix it."],
        answer: 0,
        explanation: "Name the blocker and make a specific request.",
      },
      {
        prompt: "Which phrase makes a recommendation easier to act on?",
        options: ["We should improve this.", "I recommend moving the summary to the first page."],
        answer: 1,
        explanation: "A specific recommendation tells the listener exactly what to consider changing.",
      },
    ],
  },
];

function loadBestScores(): Partial<Record<GameId, number>> {
  if (typeof window === "undefined") return {};
  try {
    const stored = JSON.parse(window.localStorage.getItem("communication-games-best-scores") ?? "{}");
    if (!stored || typeof stored !== "object") return {};
    return Object.fromEntries(
      Object.entries(stored).filter(([id, score]) =>
        GAMES.some(game => game.id === id) && typeof score === "number" && Number.isFinite(score),
      ),
    ) as Partial<Record<GameId, number>>;
  } catch {
    return {};
  }
}

export default function Games() {
  const queryClient = useQueryClient();
  const { mutate: updateProgress } = useUpdateProgress();
  const [activeGame, setActiveGame] = useState<GameDefinition | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [bestScores, setBestScores] = useState(loadBestScores);

  const startGame = (game: GameDefinition) => {
    setActiveGame(game);
    setQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setCompleted(false);
  };

  const finishGame = (finalScore: number) => {
    if (!activeGame) return;
    setCompleted(true);
    const percent = Math.round((finalScore / activeGame.questions.length) * 100);
    setBestScores(previous => {
      const next = { ...previous, [activeGame.id]: Math.max(previous[activeGame.id] ?? 0, percent) };
      try {
        window.localStorage.setItem("communication-games-best-scores", JSON.stringify(next));
      } catch {
        // The current round still works if browser storage is unavailable.
      }
      return next;
    });
    updateProgress(
      {
        data: {
          type: "quiz",
          description: `Completed ${activeGame.title}`,
          pointsEarned: Math.max(5, finalScore * 2),
          accuracy: percent,
        },
      },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() }) },
    );
  };

  const currentQuestion = activeGame?.questions[questionIndex];
  const isCorrect = currentQuestion && selectedOption === currentQuestion.answer;
  const accentClasses: Record<string, string> = {
    violet: "from-violet-600 to-indigo-600",
    blue: "from-blue-600 to-cyan-600",
    emerald: "from-emerald-600 to-teal-600",
  };

  if (activeGame && completed) {
    const percent = Math.round((score / activeGame.questions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50/70 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Button variant="ghost" onClick={() => setActiveGame(null)} className="mb-5">
            <ArrowLeft className="mr-2 h-4 w-4" /> All games
          </Button>
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className={cn("bg-gradient-to-r px-6 py-10 text-center text-white", accentClasses[activeGame.accent])}>
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                <Trophy className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/80">Round complete</p>
              <h1 className="mt-2 text-3xl font-bold">{activeGame.title}</h1>
              <p className="mt-3 text-lg">{score} of {activeGame.questions.length} correct · {percent}%</p>
              <p className="mt-1 text-sm text-white/80">
                Best score: {Math.max(bestScores[activeGame.id] ?? 0, percent)}%
              </p>
            </div>
            <CardContent className="flex flex-col items-center gap-3 p-6 sm:flex-row sm:justify-center">
              <Button onClick={() => startGame(activeGame)} className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" /> Play again
              </Button>
              <Button variant="outline" onClick={() => setActiveGame(null)} className="w-full sm:w-auto">
                Choose another game
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (activeGame && currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50/70 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Button variant="ghost" onClick={() => setActiveGame(null)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Exit game
          </Button>
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className={cn("bg-gradient-to-r px-5 py-5 text-white sm:px-7", accentClasses[activeGame.accent])}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/75">{activeGame.subtitle}</p>
                  <h1 className="mt-1 text-xl font-bold sm:text-2xl">{activeGame.title}</h1>
                </div>
                <div className="rounded-xl bg-white/15 px-3 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase text-white/75">Score</p>
                  <p className="text-lg font-bold">{score}/{activeGame.questions.length}</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${((questionIndex + (selectedOption !== null ? 1 : 0)) / activeGame.questions.length) * 100}%` }}
                />
              </div>
            </div>
            <CardContent className="p-5 sm:p-7">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Question {questionIndex + 1} of {activeGame.questions.length}
              </p>
              <h2 className="text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl">{currentQuestion.prompt}</h2>
              <div className="mt-5 space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const selected = selectedOption === index;
                  const correctAnswer = selectedOption !== null && currentQuestion.answer === index;
                  return (
                    <button
                      type="button"
                      key={option}
                      disabled={selectedOption !== null}
                      onClick={() => {
                        setSelectedOption(index);
                        if (index === currentQuestion.answer) setScore(value => value + 1);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors sm:p-4",
                        selected && isCorrect && "border-emerald-400 bg-emerald-50 text-emerald-950",
                        selected && !isCorrect && "border-rose-300 bg-rose-50 text-rose-950",
                        correctAnswer && "border-emerald-400 bg-emerald-50 text-emerald-950",
                        selectedOption === null && "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50",
                        selectedOption !== null && !selected && !correctAnswer && "border-slate-100 bg-slate-50 text-slate-500",
                      )}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs font-bold">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="leading-relaxed">{option}</span>
                      {selected && isCorrect && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-600" />}
                      {selected && !isCorrect && <XCircle className="ml-auto h-5 w-5 shrink-0 text-rose-600" />}
                    </button>
                  );
                })}
              </div>
              {selectedOption !== null && (
                <div className={cn(
                  "mt-4 rounded-xl p-4 text-sm leading-relaxed",
                  isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950",
                )}>
                  <p className="font-semibold">{isCorrect ? "Correct!" : "Good practice opportunity"}</p>
                  <p className="mt-1">{currentQuestion.explanation}</p>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                {selectedOption !== null && (
                  <Button
                    onClick={() => {
                      if (questionIndex === activeGame.questions.length - 1) {
                        finishGame(score);
                      } else {
                        setQuestionIndex(index => index + 1);
                        setSelectedOption(null);
                      }
                    }}
                  >
                    {questionIndex === activeGame.questions.length - 1 ? "See results" : "Next question"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-900 p-6 text-white shadow-lg sm:p-9">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <Gamepad2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">Practice games</p>
              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Build communication skills, one round at a time</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-100">
                Short, practical challenges for clearer messages, confident word choices, and professional conversations.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {GAMES.map(game => {
            const Icon = game.icon;
            return (
              <Card key={game.id} className="group overflow-hidden border-slate-200/80 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-0">
                  <div className={cn("h-2 bg-gradient-to-r", accentClasses[game.accent])} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                        <Icon className="h-6 w-6" />
                      </div>
                      {bestScores[game.id] !== undefined && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          Best {bestScores[game.id]}%
                        </span>
                      )}
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-indigo-600">{game.subtitle}</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">{game.title}</h2>
                    <p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-600">{game.description}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">{game.questions.length} questions · Quick round</span>
                      <Button onClick={() => startGame(game)} size="sm">
                        Play <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
