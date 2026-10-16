import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { PracticeBody } from "./practice/QuestionBody";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  getCard,
  nextDueLabel,
  pickNextCard,
  previewIntervals,
  reviewCounts,
  type Rating,
  type SrsStore,
} from "../lib/srs";
import type { Question, SourcesMap } from "../lib/types";
import { cn } from "../lib/utils";

const RATING_STYLES: Record<
  Rating,
  { label: string; className: string; shortcut: string }
> = {
  again: {
    label: "Again",
    shortcut: "1",
    className: "bg-[#de3831] text-white hover:bg-[#c42e28]",
  },
  hard: {
    label: "Hard",
    shortcut: "2",
    className: "bg-[#f3e7c0] text-[#6b5310] hover:bg-[#ead9a0]",
  },
  good: {
    label: "Good",
    shortcut: "3",
    className: "bg-[#163028] text-[#f7f3ea] hover:bg-[#1f4034]",
  },
  easy: {
    label: "Easy",
    shortcut: "4",
    className: "bg-[#c9a227] text-[#163028] hover:bg-[#b7921c]",
  },
};

export function Review({
  questions,
  sources,
  store,
  onRate,
  onNewLimit,
}: {
  questions: Question[];
  sources: SourcesMap;
  store: SrsStore;
  onRate: (id: string, rating: Rating) => SrsStore;
  onNewLimit: (limit: number) => void;
}) {
  const ids = useMemo(() => questions.map((question) => question.id), [questions]);
  const byId = useMemo(() => {
    const map = new Map<string, Question>();
    for (const question of questions) map.set(question.id, question);
    return map;
  }, [questions]);
  const counts = useMemo(() => reviewCounts(store, ids), [store, ids]);
  const later = useMemo(() => nextDueLabel(store, ids), [store, ids]);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<boolean | null | undefined>(undefined);

  useLayoutEffect(() => {
    setCurrentId((current) => {
      if (current && byId.has(current)) return current;
      return pickNextCard(store, ids) ?? null;
    });
    setAnswered(undefined);
  }, [ids, byId, store.newLimit]);

  const question = currentId ? (byId.get(currentId) ?? null) : null;
  const card = currentId ? getCard(store, currentId) : null;
  const previews = card ? previewIntervals(card) : null;

  function rate(rating: Rating) {
    if (!currentId) return;
    const nextStore = onRate(currentId, rating);
    setAnswered(undefined);
    setCurrentId(
      pickNextCard(nextStore, ids, Date.now(), currentId) ??
        pickNextCard(nextStore, ids) ??
        null,
    );
  }

  useEffect(() => {
    if (answered === undefined || !currentId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const map: Record<string, Rating> = { "1": "again", "2": "hard", "3": "good", "4": "easy" };
      const rating = map[event.key];
      if (!rating) return;
      event.preventDefault();
      rate(rating);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, currentId]);

  function startOrAdvance() {
    setAnswered(undefined);
    setCurrentId(pickNextCard(store, ids) ?? null);
  }

  if (!question || !card || !previews) {
    return (
      <section className="rounded-xl border border-[#d5ddd4] bg-white/80 px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl">Review</h2>
        <p className="mt-2 max-w-xl text-sm text-[#3d5247]">
          {counts.total === 0
            ? "You're caught up for now. Hard cards come back within minutes; easy ones stretch to days and weeks."
            : "No cards match these filters."}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <CountChip label="Due" value={counts.due} />
          <CountChip label="Learning" value={counts.learning} />
          <CountChip label="New left" value={counts.newLeft} />
          <CountChip label="New in filter" value={counts.newAvailable} />
        </dl>
        {later ? (
          <p className="mt-4 text-xs text-[#5b6e63]">Next scheduled card: {later}.</p>
        ) : null}
        <NewLimitField value={store.newLimit} onChange={onNewLimit} />
        {counts.total > 0 ? (
          <Button className="mt-4" onClick={startOrAdvance}>
            Start review
          </Button>
        ) : null}
      </section>
    );
  }

  const wrong = answered === false;
  const kind =
    card.state === "new" ? "New" : card.state === "review" ? "Review" : "Learning";

  return (
    <section className="flex min-h-[min(78svh,44rem)] flex-col overflow-hidden rounded-xl border border-[#d5ddd4] bg-[#fffcf7]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4eadc] px-3 py-2.5 sm:px-4">
        <div>
          <p className="text-[11px] tracking-wide text-[#5b6e63] uppercase">{kind}</p>
          <p className="text-sm font-medium text-[#14241c]">
            {counts.due} due · {counts.learning} learning · {counts.newLeft} new
          </p>
        </div>
        <NewLimitField value={store.newLimit} onChange={onNewLimit} compact />
      </header>
      <PracticeBody
        key={question.id}
        question={question}
        sources={sources}
        compact
        onGraded={(correct) => setAnswered(correct)}
      />
      {answered !== undefined ? (
        <div className="border-t border-[#e4eadc] bg-white/90 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
          <p className="mb-2 text-xs text-[#5b6e63]">
            {wrong
              ? "Wrong answers default to Again — you can still pick another rating."
              : answered === null
                ? "How well did you know this?"
                : "How easy was that?"}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["again", "hard", "good", "easy"] as Rating[]).map((rating) => {
              const style = RATING_STYLES[rating];
              const preferred = wrong && rating === "again";
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => rate(rating)}
                  className={cn(
                    "flex min-h-12 touch-manipulation flex-col items-center justify-center rounded-lg px-2 py-2 text-sm font-semibold",
                    style.className,
                    preferred ? "ring-2 ring-[#14241c] ring-offset-2" : "",
                  )}
                >
                  <span>
                    {style.label}{" "}
                    <span className="hidden font-normal opacity-70 sm:inline">({style.shortcut})</span>
                  </span>
                  <span className="text-[11px] font-medium opacity-90">{previews[rating]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="border-t border-[#e4eadc] px-3 py-2 text-center text-xs text-[#7a8b80] sm:px-4">
          Answer the card, then rate it. Again repeats this session; Easy stretches the wait.
        </p>
      )}
    </section>
  );
}

function CountChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f7f8f4] px-3 py-2">
      <p className="text-[10px] tracking-wide text-[#5b6e63] uppercase">{label}</p>
      <p className="text-lg font-semibold text-[#14241c]">{value}</p>
    </div>
  );
}

function NewLimitField({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (n: number) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-xs text-[#3d5247]",
        compact ? "" : "mt-5",
      )}
    >
      Daily new
      <Input
        type="number"
        min={0}
        max={200}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-8 w-16 px-2"
        aria-label="Daily new-card limit"
      />
    </label>
  );
}
