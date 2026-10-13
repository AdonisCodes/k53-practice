export const CATEGORIES = ["rules", "signs", "controls"] as const;
export type Category = (typeof CATEGORIES)[number];

export const LICENCE_CODES = ["1", "2", "3"] as const;

export const QUESTION_TYPES = [
  "single",
  "multi",
  "true-false",
  "image-select",
  "hotspot",
  "ordering",
  "matching",
  "fill-blank",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const COLUMN_DEFS = [
  { id: "to-study", label: "To study", hint: "Not attempted yet" },
  { id: "got-wrong", label: "Got wrong", hint: "Review these first" },
  {
    id: "getting-there",
    label: "Getting there",
    hint: "Answered correctly once",
  },
  { id: "mastered", label: "Mastered", hint: "Solid — keep them here" },
] as const;
export type ColumnId = (typeof COLUMN_DEFS)[number]["id"];

export const CATEGORY_LABELS: Record<Category, string> = {
  rules: "Rules of the road",
  signs: "Road signs",
  controls: "Vehicle controls",
};

export const TYPE_LABELS: Record<QuestionType, string> = {
  single: "Single choice",
  multi: "Multi choice",
  "true-false": "True / false",
  "image-select": "Image select",
  hotspot: "Hotspot",
  ordering: "Ordering",
  matching: "Matching",
  "fill-blank": "Fill blank",
};

export type SourceId = string;

export type SourceMeta = {
  name?: string;
  url?: string | null;
};

export type SourcesMap = Record<SourceId, SourceMeta>;

export type Option = {
  id: string;
  text: string;
  image: string | null;
};

export type Hotspot = { x: number; y: number; r: number };

export type Question = {
  id: string;
  source: SourceId;
  category: string;
  licenceCodes: string[];
  type: string;
  question: string;
  image: string | null;
  options: Option[];
  answer: unknown;
  explanation?: string;
  tags: string[];
  sourceRef: string | null;
  manualRef: string | null;
};

export type DataIndex = {
  updatedAt?: string;
  sources: SourcesMap;
  batches: string[];
};

export type Filters = {
  search: string;
  category: string;
  licenceCode: string;
  type: string;
  source: string;
  aiOnly: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  search: "",
  category: "all",
  licenceCode: "all",
  type: "all",
  source: "all",
  aiOnly: false,
};

export type ProgressMap = Record<string, ColumnId>;

export type QuizState = {
  ids: string[];
  index: number;
  done: boolean;
};

export function creditFor(
  source: string,
  sources: SourcesMap,
  tags: string[] = [],
) {
  const meta = sources[source];
  const showAi = tags.includes("AI") || source === "ai";
  if (source === "practicek53") {
    return {
      label: "K53 Test",
      url: meta?.url ?? "https://practicek53.co.za/",
      showAi,
    };
  }
  if (source === "appsworld") {
    return {
      label: "Appsworld",
      url: meta?.url ?? "https://youtube.com/@onlinedrivingacademy",
      showAi,
    };
  }
  return { label: meta?.name ?? source, url: meta?.url ?? null, showAi };
}

export function sourceShortName(source: string, sources: SourcesMap) {
  if (source === "practicek53") return "K53 Test";
  if (source === "appsworld") return "Appsworld";
  if (source === "ai") return "AI";
  return sources[source]?.name ?? source;
}
