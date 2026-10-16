import { loadProgress } from "./progress";
import type { ColumnId, ProgressMap } from "./types";

export type Rating = "again" | "hard" | "good" | "easy";
export type SrsState = "new" | "learning" | "relearning" | "review";

export type SrsCard = {
  ease: number;
  interval: number;
  due: number;
  reps: number;
  lapses: number;
  state: SrsState;
  step: number;
};

export type SrsStore = {
  version: 1;
  cards: Record<string, SrsCard>;
  newLimit: number;
  newDate: string;
  newCount: number;
};

export const SRS_STORAGE_KEY = "k53-simon-ferns-srs-v1";
export const DEFAULT_NEW_LIMIT = 20;
export const MATURE_INTERVAL_DAYS = 21;
export const LEARN_AHEAD_MS = 20 * 60 * 1000;

const MINUTE_DAYS = 1 / (24 * 60);
const LEARN_STEPS = [1 * MINUTE_DAYS, 10 * MINUTE_DAYS];
const RELEARN_STEPS = [10 * MINUTE_DAYS];
const GRADUATING_DAYS = 1;
const EASY_INTERVAL_DAYS = 4;
const STARTING_EASE = 2.6;
const MIN_EASE = 1.3;
const EASY_BONUS = 1.3;
const HARD_FACTOR = 1.2;
const DAY_MS = 86_400_000;

export const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

export function todayKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function blankCard(): SrsCard {
  return {
    ease: STARTING_EASE,
    interval: 0,
    due: 0,
    reps: 0,
    lapses: 0,
    state: "new",
    step: 0,
  };
}

export function getCard(store: SrsStore, id: string): SrsCard {
  return store.cards[id] ?? blankCard();
}

function daysToMs(days: number) {
  return days * DAY_MS;
}

function clampEase(ease: number) {
  return Math.max(MIN_EASE, Math.round(ease * 100) / 100);
}

function roundReviewInterval(days: number) {
  return Math.max(1, Math.round(days));
}

export function formatInterval(days: number) {
  if (!Number.isFinite(days) || days <= 0) return "<1m";
  const minutes = days * 24 * 60;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h`;
  if (days < 21) return `${Math.round(days)}d`;
  const weeks = days / 7;
  if (days < 60) return `${Math.max(1, Math.round(weeks))}w`;
  const months = days / 30.44;
  if (days < 365) return months < 10 ? `${months.toFixed(1)}mo` : `${Math.round(months)}mo`;
  const years = days / 365;
  return `${years < 10 ? years.toFixed(1) : Math.round(years)}y`;
}

function stepsFor(state: SrsState) {
  return state === "relearning" ? RELEARN_STEPS : LEARN_STEPS;
}

function withDue(card: SrsCard, now: number, intervalDays: number): SrsCard {
  return { ...card, interval: intervalDays, due: now + daysToMs(intervalDays) };
}

function graduate(card: SrsCard, now: number, intervalDays: number, easy: boolean): SrsCard {
  const ease = easy ? clampEase(card.ease + 0.15) : card.ease;
  return {
    ...card,
    state: "review",
    step: 0,
    ease,
    reps: card.reps + 1,
    interval: roundReviewInterval(intervalDays),
    due: now + daysToMs(roundReviewInterval(intervalDays)),
  };
}

function applyLearning(card: SrsCard, rating: Rating, now: number): SrsCard {
  const state: SrsState =
    card.state === "relearning" ? "relearning" : "learning";
  const steps = stepsFor(state);
  const reps = card.reps + 1;

  if (rating === "again") {
    return withDue({ ...card, state, step: 0, reps }, now, MINUTE_DAYS);
  }

  if (rating === "easy") {
    return graduate({ ...card, state }, now, EASY_INTERVAL_DAYS, true);
  }

  if (rating === "hard") {
    const again = steps[0] ?? MINUTE_DAYS;
    const good = steps[Math.min(card.step + 1, steps.length - 1)] ?? again;
    const hardIv = Math.max(again, (again + good) / 2);
    return withDue({ ...card, state: card.state === "new" ? "learning" : state, reps }, now, hardIv);
  }

  const step = card.state === "new" ? 0 : card.step;
  const nextStep = card.state === "new" ? 0 : step + 1;
  if (card.state !== "new" && nextStep >= steps.length) {
    return graduate({ ...card, state }, now, GRADUATING_DAYS, false);
  }
  const index = card.state === "new" ? 0 : nextStep;
  const nextState: SrsState = state;
  return withDue(
    { ...card, state: nextState, step: index, reps },
    now,
    steps[index] ?? GRADUATING_DAYS,
  );
}

function applyReview(card: SrsCard, rating: Rating, now: number): SrsCard {
  const reps = card.reps + 1;
  if (rating === "again") {
    return withDue(
      {
        ...card,
        reps,
        lapses: card.lapses + 1,
        ease: clampEase(card.ease - 0.2),
        state: "relearning",
        step: 0,
      },
      now,
      MINUTE_DAYS,
    );
  }
  if (rating === "hard") {
    const interval = roundReviewInterval(Math.max(card.interval * HARD_FACTOR, 1.2));
    return {
      ...card,
      reps,
      ease: clampEase(card.ease - 0.15),
      interval,
      due: now + daysToMs(interval),
    };
  }
  if (rating === "good") {
    const interval = roundReviewInterval(card.interval * card.ease);
    return { ...card, reps, interval, due: now + daysToMs(interval) };
  }
  const interval = roundReviewInterval(Math.max(card.interval + 1, card.interval * card.ease * EASY_BONUS));
  return {
    ...card,
    reps,
    ease: clampEase(card.ease + 0.15),
    interval,
    due: now + daysToMs(interval),
  };
}

export function applyRating(card: SrsCard, rating: Rating, now = Date.now()): SrsCard {
  if (card.state === "review") return applyReview(card, rating, now);
  return applyLearning(card, rating, now);
}

export function previewIntervals(card: SrsCard, now = Date.now()): Record<Rating, string> {
  return {
    again: formatInterval(applyRating(card, "again", now).interval),
    hard: formatInterval(applyRating(card, "hard", now).interval),
    good: formatInterval(applyRating(card, "good", now).interval),
    easy: formatInterval(applyRating(card, "easy", now).interval),
  };
}

export function columnFromCard(card: SrsCard | undefined): ColumnId {
  if (!card || card.state === "new") return "to-study";
  if (card.state === "learning" || card.state === "relearning") return "got-wrong";
  if (card.interval >= MATURE_INTERVAL_DAYS) return "mastered";
  return "getting-there";
}

export function progressFromStore(store: SrsStore, ids: string[]): ProgressMap {
  const progress: ProgressMap = {};
  for (const id of ids) {
    const column = columnFromCard(store.cards[id]);
    if (column !== "to-study") progress[id] = column;
  }
  return progress;
}

export function cardFromColumn(column: ColumnId, now = Date.now()): SrsCard | null {
  if (column === "to-study") return null;
  if (column === "got-wrong") {
    return withDue(
      {
        ...blankCard(),
        state: "relearning",
        lapses: 1,
        reps: 1,
        ease: 2.3,
        step: 0,
      },
      now,
      RELEARN_STEPS[0] ?? 10 * MINUTE_DAYS,
    );
  }
  if (column === "getting-there") {
    return {
      ...blankCard(),
      state: "review",
      reps: 1,
      interval: 3,
      due: now + daysToMs(3),
    };
  }
  return {
    ...blankCard(),
    state: "review",
    reps: 2,
    interval: MATURE_INTERVAL_DAYS,
    due: now + daysToMs(MATURE_INTERVAL_DAYS),
  };
}

function emptyStore(): SrsStore {
  return {
    version: 1,
    cards: {},
    newLimit: DEFAULT_NEW_LIMIT,
    newDate: todayKey(),
    newCount: 0,
  };
}

function migrateFromBoard(progress: ProgressMap, now: number): Record<string, SrsCard> {
  const cards: Record<string, SrsCard> = {};
  for (const [id, column] of Object.entries(progress) as [string, ColumnId][]) {
    const card = cardFromColumn(column, now);
    if (column === "got-wrong" && card) {
      cards[id] = { ...card, due: now };
    } else if (column === "getting-there" && card) {
      cards[id] = { ...card, due: now + daysToMs(1) };
    } else if (card) {
      cards[id] = card;
    }
  }
  return cards;
}

export function loadSrs(now = Date.now()): SrsStore {
  try {
    const raw = localStorage.getItem(SRS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SrsStore>;
      const store: SrsStore = {
        ...emptyStore(),
        ...parsed,
        version: 1,
        cards: parsed.cards && typeof parsed.cards === "object" ? parsed.cards : {},
        newLimit:
          typeof parsed.newLimit === "number" && parsed.newLimit >= 0
            ? Math.min(200, Math.round(parsed.newLimit))
            : DEFAULT_NEW_LIMIT,
      };
      return rolloverNewCount(store, now);
    }
  } catch {
    /* fall through and migrate */
  }
  const progress = loadProgress();
  const store: SrsStore = {
    ...emptyStore(),
    cards: migrateFromBoard(progress, now),
  };
  saveSrs(store);
  return store;
}

export function saveSrs(store: SrsStore) {
  localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(store));
}

export function rolloverNewCount(store: SrsStore, now = Date.now()): SrsStore {
  const today = todayKey(now);
  if (store.newDate === today) return store;
  return { ...store, newDate: today, newCount: 0 };
}

export function setNewLimit(store: SrsStore, limit: number): SrsStore {
  const newLimit = Math.max(0, Math.min(200, Math.round(Number.isFinite(limit) ? limit : DEFAULT_NEW_LIMIT)));
  return { ...store, newLimit };
}

export function rateCard(store: SrsStore, id: string, rating: Rating, now = Date.now()): SrsStore {
  const rolled = rolloverNewCount(store, now);
  const previous = getCard(rolled, id);
  const next = applyRating(previous, rating, now);
  const newCount =
    previous.state === "new" ? rolled.newCount + 1 : rolled.newCount;
  return {
    ...rolled,
    newCount,
    cards: { ...rolled.cards, [id]: next },
  };
}

export function moveCardToColumn(store: SrsStore, id: string, column: ColumnId, now = Date.now()): SrsStore {
  const rolled = rolloverNewCount(store, now);
  const next = { ...rolled.cards };
  const card = cardFromColumn(column, now);
  if (!card) delete next[id];
  else next[id] = card;
  return { ...rolled, cards: next };
}

function isDue(card: SrsCard, now: number, aheadMs = 0) {
  if (card.state === "new") return false;
  return card.due <= now + aheadMs;
}

export function reviewCounts(store: SrsStore, ids: string[], now = Date.now()) {
  const rolled = rolloverNewCount(store, now);
  let due = 0;
  let learning = 0;
  let neu = 0;
  for (const id of ids) {
    const card = rolled.cards[id];
    if (!card || card.state === "new") {
      neu += 1;
      continue;
    }
    if (card.state === "learning" || card.state === "relearning") {
      if (isDue(card, now, LEARN_AHEAD_MS)) learning += 1;
    } else if (isDue(card, now)) {
      due += 1;
    }
  }
  const newLeft = Math.min(neu, Math.max(0, rolled.newLimit - rolled.newCount));
  return {
    due,
    learning,
    newLeft,
    newAvailable: neu,
    total: due + learning + newLeft,
  };
}

export function pickNextCard(
  store: SrsStore,
  ids: string[],
  now = Date.now(),
  excludeId?: string,
): string | null {
  const rolled = rolloverNewCount(store, now);
  let dueId: string | null = null;
  let dueAt = Infinity;
  let learnId: string | null = null;
  let learnAt = Infinity;
  const newIds: string[] = [];

  for (const id of ids) {
    if (id === excludeId) continue;
    const card = rolled.cards[id];
    if (!card || card.state === "new") {
      newIds.push(id);
      continue;
    }
    if (card.state === "learning" || card.state === "relearning") {
      if (card.due <= now && card.due < dueAt) {
        dueId = id;
        dueAt = card.due;
      } else if (card.due <= now + LEARN_AHEAD_MS && card.due < learnAt) {
        learnId = id;
        learnAt = card.due;
      }
    } else if (card.due <= now && card.due < dueAt) {
      dueId = id;
      dueAt = card.due;
    }
  }

  if (dueId) return dueId;
  if (learnId) return learnId;
  if (newIds.length && rolled.newCount < rolled.newLimit) {
    return newIds[Math.floor(Math.random() * newIds.length)] ?? null;
  }
  return null;
}

export function nextDueLabel(store: SrsStore, ids: string[], now = Date.now()): string | null {
  let soonest = Infinity;
  for (const id of ids) {
    const card = store.cards[id];
    if (!card || card.state === "new") continue;
    if (card.due < soonest) soonest = card.due;
  }
  if (!Number.isFinite(soonest)) return null;
  const delta = soonest - now;
  if (delta <= 0) return "now";
  return formatInterval(delta / DAY_MS);
}
