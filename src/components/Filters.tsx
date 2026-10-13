import { Play, Search } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_FILTERS,
  LICENCE_CODES,
  TYPE_LABELS,
  sourceShortName,
  type Filters,
  type QuestionType,
  type SourcesMap,
} from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function FilterBar({
  filters,
  sources,
  typesPresent,
  onChange,
  quizSize,
  onQuizSize,
  onQuickTest,
  maxQuiz,
}: {
  filters: Filters;
  sources: SourcesMap;
  typesPresent: QuestionType[];
  onChange: (next: Filters) => void;
  quizSize: number;
  onQuizSize: (n: number) => void;
  onQuickTest: () => void;
  maxQuiz: number;
}) {
  const selectClass =
    "h-9 max-w-[14rem] rounded-md border border-white/15 bg-[#1f4034] px-2 text-sm text-[#f7f3ea] outline-none focus-visible:outline-2 focus-visible:outline-[#c9a227]";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#9db5a6]" />
          <Input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Search questions"
            className="border-white/15 bg-white pl-8 text-[#14241c]"
            aria-label="Search questions"
          />
        </div>
        <select
          className={selectClass}
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
          aria-label="Category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.licenceCode}
          onChange={(event) => onChange({ ...filters, licenceCode: event.target.value })}
          aria-label="Licence code"
        >
          <option value="all">All licence codes</option>
          {LICENCE_CODES.map((code) => (
            <option key={code} value={code}>
              Code {code}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.type}
          onChange={(event) => onChange({ ...filters, type: event.target.value })}
          aria-label="Question type"
        >
          <option value="all">All types</option>
          {typesPresent.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.source}
          onChange={(event) => onChange({ ...filters, source: event.target.value })}
          aria-label="Source"
        >
          <option value="all">All sources</option>
          {Object.entries(sources).map(([id]) => (
            <option key={id} value={id}>
              {sourceShortName(id, sources)}
            </option>
          ))}
        </select>
        <label className="inline-flex h-9 items-center gap-2 rounded-md bg-[#1f4034] px-3 text-sm">
          <input
            type="checkbox"
            checked={filters.aiOnly}
            onChange={(event) => onChange({ ...filters, aiOnly: event.target.checked })}
          />
          AI tag
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Quick test
          <input
            type="number"
            min={1}
            max={maxQuiz}
            value={quizSize}
            onChange={(event) => onQuizSize(Number(event.target.value) || 1)}
            className="h-9 w-16 rounded-md border border-white/15 bg-[#1f4034] px-2 text-sm"
            aria-label="Number of quick-test questions"
          />
        </label>
        <Button variant="gold" onClick={onQuickTest}>
          <Play className="size-4" />
          Start
        </Button>
        <Button
          variant="ghost"
          className="text-[#d5e0d6] hover:text-[#163028]"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          Reset filters
        </Button>
      </div>
    </div>
  );
}
