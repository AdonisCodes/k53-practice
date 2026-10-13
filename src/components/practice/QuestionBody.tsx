import { Check, ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  answerLabel,
  canGradeInteractively,
  fillBlankAnswers,
  gradeFillBlank,
  gradeHotspot,
  gradeSelection,
  matchingSides,
  parseHotspots,
} from "../../lib/grade";
import type { Question, SourcesMap } from "../../lib/types";
import { CATEGORY_LABELS, TYPE_LABELS } from "../../lib/types";
import { cn, dataUrl } from "../../lib/utils";
import { SourceCredit } from "../SourceCredit";
import { Button } from "../ui/button";

function useGradeOnce(onGraded?: (correct: boolean) => void) {
  const [result, setResult] = useState<{ correct: boolean } | null>(null);
  return {
    result,
    grade: (correct: boolean) => {
      if (result) return;
      setResult({ correct });
      onGraded?.(correct);
    },
  };
}

function Prompt({ question }: { question: Question }) {
  return (
    <div className="space-y-3">
      <p className="text-base leading-relaxed font-medium text-[#14241c]">{question.question}</p>
      {question.image ? (
        <img
          src={dataUrl(question.image)}
          alt=""
          className="max-h-64 w-full rounded-lg border border-[#e4eadc] bg-white object-contain"
        />
      ) : null}
    </div>
  );
}

function Feedback({ question, correct }: { question: Question; correct: boolean }) {
  return (
    <div
      className={cn(
        "mt-4 space-y-2 rounded-lg border px-3 py-3 text-sm",
        correct ? "border-[#9dcea8] bg-[#eef8f0]" : "border-[#f0b8b5] bg-[#fdf1f0]",
      )}
    >
      <p className="flex items-center gap-2 font-semibold">
        {correct ? (
          <Check className="size-4 text-[#007749]" />
        ) : (
          <X className="size-4 text-[#de3831]" />
        )}
        {correct ? "Correct" : "Not quite"}
      </p>
      <p>
        <span className="font-medium">Answer: </span>
        {answerLabel(question)}
      </p>
      {question.explanation ? <p className="text-[#3d5247]">{question.explanation}</p> : null}
      {question.manualRef ? (
        <p className="text-xs text-[#5b6e63]">Source note: {question.manualRef}</p>
      ) : null}
      {question.sourceRef ? (
        <p className="text-xs">
          <a
            className="text-[#0b5cab] underline"
            href={question.sourceRef}
            target="_blank"
            rel="noreferrer"
          >
            Original reference
          </a>
        </p>
      ) : null}
    </div>
  );
}

function ChoiceQuestion({
  question,
  onGraded,
  multiple,
}: {
  question: Question;
  onGraded?: (correct: boolean) => void;
  multiple: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const { result, grade } = useGradeOnce(onGraded);
  const options = question.options ?? [];
  const toggle = (id: string) => {
    if (result) return;
    setPicked((current) =>
      multiple ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id],
    );
  };
  return (
    <div>
      <Prompt question={question} />
      {multiple && !result ? (
        <p className="mt-2 text-xs text-[#5b6e63]">Select every option that applies.</p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {options.map((option) => {
          const selected = picked.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => toggle(option.id)}
                disabled={!!result}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-left text-sm",
                  selected
                    ? "border-[#163028] bg-[#e7efe3]"
                    : "border-[#d5ddd4] bg-white hover:bg-[#f6f8f3]",
                  result && selected && !gradeSelection(question, [option.id]) && multiple === false
                    ? "border-[#de3831] bg-[#fdf1f0]"
                    : "",
                )}
              >
                <span className="mr-2 font-semibold text-[#3d5247]">{option.id}.</span>
                {option.text}
              </button>
            </li>
          );
        })}
      </ul>
      {result ? (
        <Feedback question={question} correct={result.correct} />
      ) : (
        <Button className="mt-4" disabled={picked.length === 0} onClick={() => grade(gradeSelection(question, picked))}>
          Check answer
        </Button>
      )}
    </div>
  );
}

function ImageSelectQuestion({
  question,
  onGraded,
}: {
  question: Question;
  onGraded?: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const { result, grade } = useGradeOnce(onGraded);
  const options = question.options ?? [];
  return (
    <div>
      <p className="text-base leading-relaxed font-medium">{question.question}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {options.map((option) => {
          const selected = picked === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={!!result}
              onClick={() => setPicked(option.id)}
              className={cn(
                "overflow-hidden rounded-lg border bg-white text-left",
                selected ? "border-[#163028] ring-2 ring-[#163028]" : "border-[#d5ddd4]",
              )}
            >
              {option.image ? (
                <img
                  src={dataUrl(option.image)}
                  alt={option.text}
                  className="h-32 w-full object-contain bg-[#f4f1ea]"
                />
              ) : null}
              <span className="block px-2 py-1.5 text-xs font-medium">
                {option.id}. {option.text}
              </span>
            </button>
          );
        })}
      </div>
      {result ? (
        <Feedback question={question} correct={result.correct} />
      ) : (
        <Button
          className="mt-4"
          disabled={!picked}
          onClick={() => grade(gradeSelection(question, picked ? [picked] : []))}
        >
          Check answer
        </Button>
      )}
    </div>
  );
}

function HotspotQuestion({
  question,
  onGraded,
}: {
  question: Question;
  onGraded?: (correct: boolean) => void;
}) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const { result, grade } = useGradeOnce(onGraded);
  const spots = parseHotspots(question.answer);
  return (
    <div>
      <p className="text-base leading-relaxed font-medium">{question.question}</p>
      <p className="mt-1 text-xs text-[#5b6e63]">Tap the correct place on the image.</p>
      <button
        type="button"
        onClick={(event) => {
          if (result) return;
          const box = event.currentTarget.getBoundingClientRect();
          setPoint({
            x: (event.clientX - box.left) / box.width,
            y: (event.clientY - box.top) / box.height,
          });
        }}
        className="relative mt-3 block w-full overflow-hidden rounded-lg border border-[#d5ddd4] bg-white"
      >
        {question.image ? (
          <img src={dataUrl(question.image)} alt="" className="w-full object-contain" />
        ) : null}
        {point ? (
          <span
            className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#de3831] shadow"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
          />
        ) : null}
        {result
          ? spots.map((spot, index) => (
              <span
                key={index}
                className="absolute rounded-full border-2 border-[#007749] bg-[#007749]/20"
                style={{
                  left: `${spot.x * 100}%`,
                  top: `${spot.y * 100}%`,
                  width: `${spot.r * 2 * 100}%`,
                  height: `${spot.r * 2 * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))
          : null}
      </button>
      {result ? (
        <Feedback question={question} correct={result.correct} />
      ) : (
        <Button className="mt-4" disabled={!point} onClick={() => point && grade(gradeHotspot(question, point))}>
          Check answer
        </Button>
      )}
    </div>
  );
}

function OrderingQuestion({
  question,
  onGraded,
}: {
  question: Question;
  onGraded?: (correct: boolean) => void;
}) {
  const initial = useMemo(() => (question.options ?? []).map((option) => option.id), [question]);
  const [order, setOrder] = useState(initial);
  const { result, grade } = useGradeOnce(onGraded);
  const move = (index: number, delta: number) => {
    if (result) return;
    const next = [...order];
    const swap = index + delta;
    if (swap < 0 || swap >= next.length) return;
    const a = next[index];
    const b = next[swap];
    if (a !== undefined && b !== undefined) {
      next[index] = b;
      next[swap] = a;
      setOrder(next);
    }
  };
  return (
    <div>
      <Prompt question={question} />
      <ol className="mt-3 space-y-2">
        {order.map((id, index) => {
          const option = question.options?.find((item) => item.id === id);
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-lg border border-[#d5ddd4] bg-white px-2 py-2"
            >
              <GripVertical className="size-4 text-[#9aa897]" />
              <span className="w-5 text-xs font-semibold text-[#5b6e63]">{index + 1}</span>
              <span className="flex-1 text-sm">{option?.text ?? id}</span>
              <button
                type="button"
                className="rounded p-1 hover:bg-[#e4eadc]"
                onClick={() => move(index, -1)}
                disabled={!!result}
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                className="rounded p-1 hover:bg-[#e4eadc]"
                onClick={() => move(index, 1)}
                disabled={!!result}
              >
                <ChevronDown className="size-4" />
              </button>
            </li>
          );
        })}
      </ol>
      {result ? (
        <Feedback question={question} correct={result.correct} />
      ) : (
        <Button className="mt-4" onClick={() => grade(gradeSelection(question, order))}>
          Check answer
        </Button>
      )}
    </div>
  );
}

function MatchingQuestion({
  question,
  onGraded,
}: {
  question: Question;
  onGraded?: (correct: boolean) => void;
}) {
  const { left, right } = matchingSides(question.options);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const { result, grade } = useGradeOnce(onGraded);
  return (
    <div>
      <Prompt question={question} />
      <ul className="mt-3 space-y-3">
        {left.map((option) => (
          <li key={option.id} className="grid gap-1 sm:grid-cols-[1fr_1fr] sm:items-center">
            <p className="text-sm font-medium">
              {option.id}. {option.text}
            </p>
            <select
              disabled={!!result}
              value={pairs[option.id] ?? ""}
              onChange={(event) =>
                setPairs((current) => ({ ...current, [option.id]: event.target.value }))
              }
              className="h-9 rounded-md border border-[#c5d0c2] bg-white px-2 text-sm"
            >
              <option value="">Match…</option>
              {right.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.id}. {choice.text}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {result ? (
        <Feedback question={question} correct={result.correct} />
      ) : (
        <Button
          className="mt-4"
          disabled={left.some((option) => !pairs[option.id])}
          onClick={() => {
            const picked = left
              .map((option) => `${option.id}:${pairs[option.id] ?? ""}`)
              .filter((item) => !item.endsWith(":"));
            grade(gradeSelection(question, picked));
          }}
        >
          Check answer
        </Button>
      )}
    </div>
  );
}

function FillBlankQuestion({
  question,
  onGraded,
}: {
  question: Question;
  onGraded?: (correct: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const { result, grade } = useGradeOnce(onGraded);
  const parts = question.question.split(/_{3,}/);
  const hint = fillBlankAnswers(question)[0];
  return (
    <div>
      {question.image ? (
        <img src={dataUrl(question.image)} alt="" className="mb-3 max-h-56 w-full object-contain" />
      ) : null}
      <p className="text-base leading-relaxed font-medium">
        {parts.length > 1
          ? parts.map((part, index) => (
              <span key={index}>
                {part}
                {index < parts.length - 1 ? (
                  <input
                    value={value}
                    disabled={!!result}
                    onChange={(event) => setValue(event.target.value)}
                    className="mx-1 inline-block w-24 border-b-2 border-[#163028] bg-transparent px-1 text-center outline-none"
                    aria-label="Your answer"
                  />
                ) : null}
              </span>
            ))
          : question.question}
      </p>
      {parts.length <= 1 ? (
        <input
          value={value}
          disabled={!!result}
          onChange={(event) => setValue(event.target.value)}
          placeholder={hint ? "Type the missing value" : "Your answer"}
          className="mt-3 h-9 w-full rounded-md border border-[#c5d0c2] bg-white px-3 text-sm"
        />
      ) : null}
      {result ? (
        <Feedback question={question} correct={result.correct} />
      ) : (
        <Button className="mt-4" disabled={!value.trim()} onClick={() => grade(gradeFillBlank(question, value))}>
          Check answer
        </Button>
      )}
    </div>
  );
}

function StudyOnly({ question }: { question: Question }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Prompt question={question} />
      {question.options && question.options.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {question.options.map((option) => (
            <li key={option.id}>
              {option.id}. {option.text}
              {option.image ? (
                <img src={dataUrl(option.image)} alt="" className="mt-1 max-h-24 object-contain" />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-xs text-[#5b6e63]">
        This question type cannot be answered interactively yet. Reveal the answer to study it — the
        card will stay where it is.
      </p>
      {open ? (
        <div className="mt-4 space-y-2 rounded-lg border border-[#d5ddd4] bg-[#f7f8f4] px-3 py-3 text-sm">
          <p>
            <span className="font-medium">Answer: </span>
            {answerLabel(question)}
          </p>
          {question.explanation ? <p className="text-[#3d5247]">{question.explanation}</p> : null}
          {question.manualRef ? (
            <p className="text-xs text-[#5b6e63]">Source note: {question.manualRef}</p>
          ) : null}
        </div>
      ) : (
        <Button className="mt-4" variant="secondary" onClick={() => setOpen(true)}>
          Reveal answer
        </Button>
      )}
    </div>
  );
}

function Interactive({
  question,
  onGraded,
}: {
  question: Question;
  onGraded?: (correct: boolean) => void;
}) {
  switch (question.type) {
    case "single":
    case "true-false":
      return <ChoiceQuestion question={question} onGraded={onGraded} multiple={false} />;
    case "multi":
      return <ChoiceQuestion question={question} onGraded={onGraded} multiple />;
    case "image-select":
      return <ImageSelectQuestion question={question} onGraded={onGraded} />;
    case "hotspot":
      return <HotspotQuestion question={question} onGraded={onGraded} />;
    case "ordering":
      return <OrderingQuestion question={question} onGraded={onGraded} />;
    case "matching":
      return <MatchingQuestion question={question} onGraded={onGraded} />;
    case "fill-blank":
      return <FillBlankQuestion question={question} onGraded={onGraded} />;
    default:
      return <StudyOnly question={question} />;
  }
}

export function PracticeBody({
  question,
  sources,
  onGraded,
}: {
  question: Question;
  sources: SourcesMap;
  onGraded: (correct: boolean) => void;
}) {
  const interactive = canGradeInteractively(question);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#3d5247]">
          <span className="rounded-full bg-[#e4eadc] px-2 py-0.5 font-medium">
            {CATEGORY_LABELS[question.category as keyof typeof CATEGORY_LABELS] ?? question.category}
          </span>
          <span className="rounded-full border border-[#d5ddd4] px-2 py-0.5">
            {TYPE_LABELS[question.type as keyof typeof TYPE_LABELS] ?? question.type}
          </span>
          <SourceCredit source={question.source} sources={sources} tags={question.tags} />
        </div>
        {interactive ? (
          <Interactive question={question} onGraded={onGraded} />
        ) : (
          <StudyOnly question={question} />
        )}
      </div>
    </div>
  );
}

export function QuizSummary({
  ids,
  questions,
  progress,
  onClose,
}: {
  ids: string[];
  questions: Question[];
  progress: Record<string, string>;
  onClose: () => void;
}) {
  const gotWrong = ids.filter((id) => (progress[id] ?? "to-study") === "got-wrong").length;
  const gotMastered = ids.filter((id) => (progress[id] ?? "to-study") === "mastered").length;
  return (
    <div className="px-5 py-4">
      <p className="text-sm">
        You worked through <strong>{ids.length}</strong> cards. {gotWrong} are now in Got wrong,{" "}
        {gotMastered} in Mastered. The rest moved toward Mastered if you got them right.
      </p>
      <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-xs text-[#3d5247]">
        {ids.map((id) => {
          const question = questions.find((item) => item.id === id);
          const column = progress[id] ?? "to-study";
          const label =
            column === "got-wrong"
              ? "Got wrong"
              : column === "getting-there"
                ? "Getting there"
                : column === "mastered"
                  ? "Mastered"
                  : "To study";
          return (
            <li key={id}>
              {question?.question ?? id} — {label}
            </li>
          );
        })}
      </ul>
      <Button className="mt-4" onClick={onClose}>
        Back to the board
      </Button>
    </div>
  );
}
