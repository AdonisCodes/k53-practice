import { COLUMN_DEFS, type ColumnId, type ProgressMap } from "./types";

const STORAGE_KEY = "k53-simon-ferns-progress-v1";

function isColumnId(value: unknown): value is ColumnId {
  return COLUMN_DEFS.some((col) => col.id === value);
}

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const columns = (JSON.parse(raw) as { columns?: Record<string, unknown> })
      .columns ?? {};
    const next: ProgressMap = {};
    for (const [id, column] of Object.entries(columns)) {
      if (isColumnId(column)) next[id] = column;
    }
    return next;
  } catch {
    return {};
  }
}

export function saveProgress(columns: ProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns }));
}

export function columnOf(progress: ProgressMap, id: string): ColumnId {
  return progress[id] ?? "to-study";
}

export function nextColumn(current: ColumnId, correct: boolean): ColumnId {
  if (!correct) return "got-wrong";
  return current === "mastered" || current === "getting-there"
    ? "mastered"
    : "getting-there";
}
