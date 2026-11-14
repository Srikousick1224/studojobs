"use client";

import { Lightbulb, Pause, Play, Shuffle, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { practiceQuestions, pickQuestion, type PracticeQuestion, type QuestionKind } from "@/lib/tools/interview-questions";
import { cn } from "@/lib/utils";

const kinds: (QuestionKind | "All")[] = ["All", "Introduction", "Behavioural", "Motivation", "Teamwork", "Technical thinking"];
const SECONDS = 120;

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function InterviewPractice() {
  const [kind, setKind] = useState<QuestionKind | "All">("All");
  const [question, setQuestion] = useState<PracticeQuestion>(practiceQuestions[0]);
  const [showTip, setShowTip] = useState(false);
  const [left, setLeft] = useState(SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  function next(k: QuestionKind | "All" = kind) {
    setQuestion((q) => pickQuestion(q.id, k));
    setShowTip(false);
    setRunning(false);
    setLeft(SECONDS);
  }

  const ratio = left / SECONDS;

  return (
    <section aria-labelledby="practice" className="rounded-2xl bg-ink-900 p-6 text-white shadow-soft">
      <h2 id="practice" className="text-xl font-bold">Interview practice</h2>
      <p className="mt-1 text-sm text-ink-300">Pick a topic, read the question aloud and answer in two minutes.</p>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Question topic">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              next(k);
            }}
            className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold transition", kind === k ? "bg-mint-500 text-ink-950" : "bg-white/10 text-ink-200 hover:bg-white/20")}
          >
            {k}
          </button>
        ))}
      </div>

      <div key={question.id} className="animate-rise mt-6 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
        <p className="text-xs font-bold uppercase tracking-wider text-mint-400">{question.kind}</p>
        <p className="mt-2 font-display text-2xl font-bold leading-snug">{question.question}</p>
        {showTip && (
          <p className="animate-rise mt-4 flex gap-2 rounded-xl bg-white/10 p-3 text-sm text-ink-100">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-mint-400" aria-hidden="true" /> {question.tip}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center" role="timer" aria-label={`Time left ${fmt(left)}`}>
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-mint-400)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${ratio * 97.4} 97.4`} className="transition-[stroke-dasharray] duration-1000 ease-linear" />
          </svg>
          <span className="relative text-xs font-bold tabular-nums">{fmt(left)}</span>
        </div>
        <Button type="button" variant="mint" onClick={() => (left === 0 ? (setLeft(SECONDS), setRunning(true)) : setRunning((r) => !r))}>
          {running ? <Pause className="h-4 w-4" aria-hidden="true" /> : left === 0 ? <Timer className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {running ? "Pause" : left === 0 ? "Restart timer" : "Start timer"}
        </Button>
        <Button type="button" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setShowTip((t) => !t)} aria-expanded={showTip}>
          <Lightbulb className="h-4 w-4" aria-hidden="true" /> {showTip ? "Hide tip" : "Show tip"}
        </Button>
        <Button type="button" variant="ghost" className="text-white hover:bg-white/10" onClick={() => next()}>
          <Shuffle className="h-4 w-4" aria-hidden="true" /> New question
        </Button>
      </div>
    </section>
  );
}
