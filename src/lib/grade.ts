import type { Hotspot, Option, Question } from "./types";

export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function parseHotspots(value: unknown): Hotspot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const rec = item as { x?: unknown; y?: unknown; r?: unknown };
    const x = Number(rec.x);
    const y = Number(rec.y);
    const r = Number(rec.r);
    return [x, y, r].every(Number.isFinite) ? [{ x, y, r }] : [];
  });
}

export function findOption(options: Option[] | undefined, id: string) {
  return options?.find((option) => option.id === id);
}

export function matchingSides(options: Option[] = []) {
  return {
    left: options.filter((option) => /^[A-Za-z]+$/.test(option.id)),
    right: options.filter((option) => /^\d+$/.test(option.id)),
  };
}

export function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((item) => other.has(item));
}

export function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

export function normalizeBlank(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/km\/h|kmh|kph/g, "")
    .replace(/millimetres?|millimeters?/g, "mm")
    .replace(/metres?|meters?/g, "m")
    .replace(/[^a-z0-9]/g, "");
}

export function fillBlankAnswers(question: Question) {
  const ids = stringList(question.answer);
  const fromOptions = ids
    .map((id) => findOption(question.options, id)?.text)
    .filter((text): text is string => !!text);
  const leftover = ids.filter(
    (id) => !question.options?.some((option) => option.id === id),
  );
  return [...fromOptions, ...leftover];
}

export function gradeFillBlank(question: Question, value: string) {
  const expected = fillBlankAnswers(question);
  const got = normalizeBlank(value);
  return expected.some((item) => normalizeBlank(item) === got);
}

export function gradeHotspot(question: Question, point: { x: number; y: number }) {
  return parseHotspots(question.answer).some((spot) => {
    const dx = point.x - spot.x;
    const dy = point.y - spot.y;
    return Math.hypot(dx, dy) <= spot.r;
  });
}

export function gradeSelection(question: Question, picked: string[]) {
  const answer = stringList(question.answer);
  if (question.type === "ordering") return sameOrder(picked, answer);
  if (question.type === "matching") {
    const key = (items: string[]) =>
      [...items]
        .map((item) => item.trim().toUpperCase())
        .sort()
        .join("|");
    return key(picked) === key(answer);
  }
  return question.type === "multi"
    ? sameSet(picked, answer)
    : picked.length === 1 && picked[0] === answer[0];
}

export function answerLabel(question: Question) {
  if (parseHotspots(question.answer).length) {
    return "The highlighted area on the image is the correct target.";
  }
  if (question.type === "fill-blank") {
    return fillBlankAnswers(question).join(" / ") || "See explanation.";
  }
  const ids = stringList(question.answer);
  if (question.type === "matching") return ids.join(", ");
  return ids
    .map((id) => {
      const option = findOption(question.options, id);
      return option ? `${option.id}. ${option.text}` : id;
    })
    .join(" → ");
}

export function canGradeInteractively(question: Question) {
  const options = question.options ?? [];
  switch (question.type) {
    case "single":
    case "true-false":
    case "image-select":
      return options.length >= 2 && stringList(question.answer).length >= 1;
    case "multi":
      return options.length >= 2 && stringList(question.answer).length >= 1;
    case "ordering":
      return options.length >= 2 && stringList(question.answer).length >= 2;
    case "matching": {
      const { left, right } = matchingSides(options);
      return left.length >= 1 && right.length >= 1 && stringList(question.answer).length >= 1;
    }
    case "hotspot":
      return !!question.image && parseHotspots(question.answer).length >= 1;
    case "fill-blank":
      return fillBlankAnswers(question).length >= 1;
    default:
      return false;
  }
}
