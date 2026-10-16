import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Board } from "./components/Board";
import { FilterBar } from "./components/Filters";
import { Review } from "./components/Review";
import { PracticeBody, QuizSummary } from "./components/practice/QuestionBody";
import { SourceCredit } from "./components/SourceCredit";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { loadBank, matchesFilters, searchBlob } from "./lib/data";
import { columnOf } from "./lib/progress";
import {
  loadSrs,
  moveCardToColumn,
  progressFromStore,
  rateCard,
  reviewCounts,
  saveSrs,
  setNewLimit,
  type Rating,
  type SrsStore,
} from "./lib/srs";
import {
  CATEGORY_LABELS,
  COLUMN_DEFS,
  DEFAULT_FILTERS,
  QUESTION_TYPES,
  creditFor,
  sourceShortName,
  type ColumnId,
  type Filters,
  type Question,
  type QuestionType,
  type QuizState,
  type SourcesMap,
} from "./lib/types";
import { cn, sampleRandom } from "./lib/utils";

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${accent ? "bg-[#c9a227] text-[#163028]" : "bg-white/10"}`}>
      <p className="text-[10px] tracking-wide uppercase opacity-80">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sources, setSources] = useState<SourcesMap>({});
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [srs, setSrs] = useState<SrsStore>(() => loadSrs());
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [quizSize, setQuizSize] = useState(10);
  const [view, setView] = useState<"board" | "review">("board");

  useEffect(() => {
    let cancelled = false;
    loadBank()
      .then((bank) => {
        if (cancelled) return;
        setQuestions(bank.questions);
        setSources(bank.index.sources);
        setUpdatedAt(bank.index.updatedAt ?? null);
        setWarnings(bank.warnings);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const commitSrs = (next: SrsStore) => {
    saveSrs(next);
    setSrs(next);
    return next;
  };

  const byId = useMemo(() => {
    const map = new Map<string, Question>();
    for (const question of questions) map.set(question.id, question);
    return map;
  }, [questions]);

  const blobs = useMemo(() => {
    const map = new Map<string, string>();
    for (const question of questions) map.set(question.id, searchBlob(question));
    return map;
  }, [questions]);

  const typesPresent = useMemo(() => {
    const present = new Set<string>();
    for (const question of questions) present.add(question.type);
    return QUESTION_TYPES.filter((type) => present.has(type));
  }, [questions]);

  const deferredFilters = useDeferredValue(filters);
  const filtered = useMemo(() => {
    const next: Question[] = [];
    for (const question of questions) {
      if (matchesFilters(question, deferredFilters, blobs.get(question.id) ?? "")) {
        next.push(question);
      }
    }
    return next;
  }, [questions, deferredFilters, blobs]);
  const filteredIds = useMemo(() => filtered.map((question) => question.id), [filtered]);
  const filtersPending = filters !== deferredFilters;
  const openQuestion = openId ? (byId.get(openId) ?? null) : null;
  const quizQuestion = quiz ? (byId.get(quiz.ids[quiz.index] ?? "") ?? null) : null;
  const progress = useMemo(
    () => progressFromStore(srs, questions.map((question) => question.id)),
    [srs, questions],
  );
  const masteredCount = useMemo(() => {
    let count = 0;
    for (const question of questions) {
      if (columnOf(progress, question.id) === "mastered") count += 1;
    }
    return count;
  }, [questions, progress]);
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of Object.keys(sources)) counts[id] = 0;
    for (const question of questions) counts[question.source] = (counts[question.source] ?? 0) + 1;
    return counts;
  }, [questions, sources]);
  const due = useMemo(() => reviewCounts(srs, filteredIds), [srs, filteredIds]);

  const gradeQuestion = (id: string, correct: boolean | null) => {
    if (correct === null) return;
    commitSrs(rateCard(srs, id, correct ? "good" : "again"));
  };

  const handleRate = (id: string, rating: Rating) => commitSrs(rateCard(srs, id, rating));

  const startQuickTest = () => {
    const pool = filtered.length ? filtered : questions;
    if (pool.length === 0) return;
    const n = Math.min(Math.max(1, quizSize), pool.length);
    setQuiz({ ids: sampleRandom(pool, n).map((question) => question.id), index: 0, done: false });
  };

  const filterBarProps = {
    filters,
    sources,
    typesPresent: typesPresent as QuestionType[],
    onChange: setFilters,
    quizSize,
    onQuizSize: setQuizSize,
    onQuickTest: startQuickTest,
    maxQuiz: Math.max(1, filtered.length || questions.length),
  };

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-[#163028] text-[#f7f3ea]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.18em] text-[#c9a227] uppercase">
                South Africa · learner's licence
              </p>
              <h1 className="font-display text-3xl leading-none sm:text-4xl">K53 Practice</h1>
              <p className="mt-1 text-sm text-[#d5e0d6]">
                Simon Ferns — rules, signs and controls on a study board.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Stat label="Questions" value={String(questions.length)} />
              {Object.entries(sourceCounts).map(([id, count]) => (
                <div key={id} className="hidden sm:block">
                  <Stat label={sourceShortName(id, sources)} value={String(count)} />
                </div>
              ))}
              <Stat label="Due" value={String(due.total)} accent={due.total > 0} />
              <Stat label="Mastered" value={`${masteredCount}/${questions.length}`} />
            </div>
          </div>
          <div className="flex rounded-lg bg-[#1f4034] p-1 text-sm font-medium">
            <button
              type="button"
              className={cn(
                "min-h-10 flex-1 rounded-md px-3 py-2",
                view === "board" ? "bg-[#c9a227] text-[#163028]" : "text-[#d5e0d6]",
              )}
              onClick={() => setView("board")}
            >
              Board
            </button>
            <button
              type="button"
              className={cn(
                "relative min-h-10 flex-1 rounded-md px-3 py-2",
                view === "review" ? "bg-[#c9a227] text-[#163028]" : "text-[#d5e0d6]",
              )}
              onClick={() => setView("review")}
            >
              Review
              {due.total > 0 ? (
                <span
                  className={cn(
                    "ml-2 inline-flex min-w-6 justify-center rounded-full px-1.5 text-[11px] font-semibold",
                    view === "review" ? "bg-[#163028] text-[#f7f3ea]" : "bg-[#de3831] text-white",
                  )}
                >
                  {due.total > 99 ? "99+" : due.total}
                </span>
              ) : null}
            </button>
          </div>
          <details className="rounded-lg bg-[#1f4034] sm:hidden">
            <summary className="cursor-pointer px-3 py-2.5 text-sm">Filters and quick test</summary>
            <div className="px-2 pb-3">
              <FilterBar {...filterBarProps} />
            </div>
          </details>
          <div className="hidden sm:block">
            <FilterBar {...filterBarProps} />
          </div>
        </div>
      </header>
      <main
        className={cn(
          "mx-auto w-full max-w-[1400px] flex-1 px-3 py-4 sm:px-6",
          view === "review" ? "flex min-h-0 flex-col" : "",
        )}
      >
        {loading ? (
          <p className="rounded-xl border border-dashed border-[#c5d0c2] bg-white/70 px-4 py-16 text-center text-sm text-[#5b6e63]">
            Loading question bank…
          </p>
        ) : error ? (
          <p className="rounded-xl border border-[#f0b8b5] bg-[#fdf1f0] px-4 py-10 text-center text-sm">
            Could not load data. {error}
          </p>
        ) : (
          <>
            {warnings.length > 0 ? (
              <div className="mb-3 rounded-lg border border-[#ead9a0] bg-[#fbf6e8] px-3 py-2 text-xs text-[#6b5310]">
                {warnings.join(" ")}
              </div>
            ) : null}
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#c5d0c2] bg-white/70 px-4 py-16 text-center text-sm text-[#5b6e63]">
                No questions match those filters. Clear search or widen the source / type.
              </p>
            ) : view === "review" ? (
              <Review
                questions={filtered}
                sources={sources}
                store={srs}
                onRate={handleRate}
                onNewLimit={(limit) => commitSrs(setNewLimit(srs, limit))}
              />
            ) : (
              <div className={filtersPending ? "opacity-70 transition-opacity" : undefined}>
                <Board
                  questions={filtered}
                  progress={progress}
                  sources={sources}
                  onMove={(id, column: ColumnId) => commitSrs(moveCardToColumn(srs, id, column))}
                  onOpen={setOpenId}
                />
              </div>
            )}
          </>
        )}
      </main>
      <footer className="mt-auto border-t border-[#d5ddd4] bg-white/70">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 text-xs text-[#3d5247] sm:px-6">
          <p className="font-medium text-[#14241c]">Question credits</p>
          <ul className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {Object.keys(sources).map((id) => {
              const credit = creditFor(id, sources, id === "ai" ? ["AI"] : []);
              return (
                <li key={id} className="flex items-center gap-2">
                  <SourceCredit source={id} sources={sources} tags={id === "ai" ? ["AI"] : []} />
                  {credit.url ? (
                    <span className="text-[#7a8b80]">({credit.url.replace(/^https?:\/\//, "")})</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p>
            Practice for the official K53 learner's test. Seed items are written from the K53 manual and
            the National Road Traffic Act / Regulations. Progress and spaced-repetition scheduling stay in
            this browser only.
            {updatedAt ? ` Bank updated ${updatedAt}.` : ""}
          </p>
        </div>
      </footer>
      <Dialog open={!!openQuestion} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Practice card</DialogTitle>
            <DialogDescription>
              {openQuestion
                ? `${CATEGORY_LABELS[openQuestion.category as keyof typeof CATEGORY_LABELS] ?? openQuestion.category} · ${COLUMN_DEFS.find((col) => col.id === columnOf(progress, openQuestion.id))?.label}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {openQuestion ? (
            <PracticeBody
              key={openQuestion.id}
              question={openQuestion}
              sources={sources}
              onGraded={(correct) => gradeQuestion(openQuestion.id, correct)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={!!quiz} onOpenChange={(open) => !open && setQuiz(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick test</DialogTitle>
            <DialogDescription>
              {quiz ? (quiz.done ? "Finished" : `Question ${quiz.index + 1} of ${quiz.ids.length}`) : ""}
            </DialogDescription>
          </DialogHeader>
          {quiz && quizQuestion && !quiz.done ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <PracticeBody
                key={quizQuestion.id}
                question={quizQuestion}
                sources={sources}
                onGraded={(correct) => gradeQuestion(quizQuestion.id, correct)}
              />
              <div className="border-t border-[#e4eadc] px-5 py-3">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setQuiz((current) =>
                      current
                        ? current.index + 1 >= current.ids.length
                          ? { ...current, done: true }
                          : { ...current, index: current.index + 1 }
                        : current,
                    )
                  }
                >
                  {quiz.index + 1 >= quiz.ids.length ? "See result" : "Next question"}
                </Button>
              </div>
            </div>
          ) : quiz?.done ? (
            <QuizSummary
              ids={quiz.ids}
              questions={questions}
              progress={progress}
              onClose={() => setQuiz(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
