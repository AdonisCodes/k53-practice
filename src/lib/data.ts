import { dataUrl } from "./utils";
import type { DataIndex, Filters, Option, Question } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseQuestion(raw: unknown): Question | null {
  if (
    !isRecord(raw) ||
    typeof raw.id !== "string" ||
    typeof raw.source !== "string" ||
    typeof raw.type !== "string" ||
    typeof raw.question !== "string"
  ) {
    return null;
  }
  const options: Option[] = Array.isArray(raw.options)
    ? raw.options.flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== "string") return [];
        return [
          {
            id: item.id,
            text: typeof item.text === "string" ? item.text : "",
            image: typeof item.image === "string" ? item.image : null,
          },
        ];
      })
    : [];
  return {
    id: raw.id,
    source: raw.source,
    category: typeof raw.category === "string" ? raw.category : "rules",
    licenceCodes: Array.isArray(raw.licenceCodes)
      ? raw.licenceCodes.filter((code): code is string => typeof code === "string")
      : [],
    type: raw.type,
    question: raw.question,
    image: typeof raw.image === "string" ? raw.image : null,
    options,
    answer: raw.answer,
    explanation: typeof raw.explanation === "string" ? raw.explanation : undefined,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    sourceRef: typeof raw.sourceRef === "string" ? raw.sourceRef : null,
    manualRef: typeof raw.manualRef === "string" ? raw.manualRef : null,
  };
}

export async function loadBank() {
  const indexUrl = dataUrl("index.json");
  const response = await fetch(indexUrl);
  if (!response.ok) {
    throw new Error(`Could not load ${indexUrl} (${response.status})`);
  }
  const index = (await response.json()) as DataIndex;
  if (!index || typeof index !== "object" || !Array.isArray(index.batches)) {
    throw new Error("data/index.json is missing a batches array");
  }
  if (!index.sources || typeof index.sources !== "object") {
    throw new Error("data/index.json is missing sources");
  }
  const warnings: string[] = [];
  const questions: Question[] = [];
  const seen = new Set<string>();
  for (const batch of index.batches) {
    const url = dataUrl(batch);
    try {
      const batchResponse = await fetch(url);
      if (!batchResponse.ok) {
        warnings.push(`Batch ${batch} failed to load (${batchResponse.status}).`);
        continue;
      }
      const payload = (await batchResponse.json()) as { questions?: unknown[] };
      for (const raw of payload.questions ?? []) {
        const question = parseQuestion(raw);
        if (!question) {
          warnings.push(`Skipped a malformed question in ${batch}.`);
          continue;
        }
        if (seen.has(question.id)) {
          warnings.push(`Duplicate id ${question.id} in ${batch} was skipped.`);
          continue;
        }
        seen.add(question.id);
        questions.push(question);
      }
    } catch (error) {
      warnings.push(`Batch ${batch} could not be parsed: ${String(error)}`);
    }
  }
  return { index, questions, warnings };
}

export function searchBlob(question: Question) {
  return [
    question.question,
    question.explanation ?? "",
    question.id,
    question.manualRef ?? "",
    ...(question.tags ?? []),
    ...(question.options ?? []).map((option) => option.text),
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesFilters(question: Question, filters: Filters, blob: string) {
  if (filters.category !== "all" && question.category !== filters.category) return false;
  if (filters.type !== "all" && question.type !== filters.type) return false;
  if (filters.source !== "all" && question.source !== filters.source) return false;
  if (filters.aiOnly && !question.tags?.includes("AI")) return false;
  if (filters.licenceCode !== "all") {
    const codes = question.licenceCodes ?? [];
    if (codes.length > 0 && !codes.includes(filters.licenceCode)) return false;
  }
  const q = filters.search.trim().toLowerCase();
  return !(q && !blob.includes(q));
}
