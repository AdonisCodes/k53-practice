import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { GripVertical } from "lucide-react";
import { memo, useMemo, useRef, useState } from "react";
import {
  CATEGORY_LABELS,
  COLUMN_DEFS,
  TYPE_LABELS,
  type ColumnId,
  type ProgressMap,
  type Question,
  type SourcesMap,
} from "../lib/types";
import { columnOf } from "../lib/progress";
import { cn } from "../lib/utils";
import { SourceCredit } from "./SourceCredit";

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  return pointerHits.length > 0 ? pointerHits : closestCenter(args);
};

export function Board({
  questions,
  progress,
  sources,
  onMove,
  onOpen,
}: {
  questions: Question[];
  progress: ProgressMap;
  sources: SourcesMap;
  onMove: (id: string, column: ColumnId) => void;
  onOpen: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );
  const byId = useMemo(() => {
    const map = new Map<string, Question>();
    for (const question of questions) map.set(question.id, question);
    return map;
  }, [questions]);
  const columns = useMemo(() => {
    const grouped: Record<ColumnId, Question[]> = {
      "to-study": [],
      "got-wrong": [],
      "getting-there": [],
      mastered: [],
    };
    for (const question of questions) grouped[columnOf(progress, question.id)].push(question);
    return grouped;
  }, [questions, progress]);
  const active = activeId ? (byId.get(activeId) ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragEnd={(event) => {
        setActiveId(null);
        const overId = event.over?.id;
        if (!overId) return;
        const column = String(overId);
        if (COLUMN_DEFS.some((def) => def.id === column)) {
          onMove(String(event.active.id), column as ColumnId);
        }
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="board-scroll flex snap-x gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-visible">
        {COLUMN_DEFS.map((column) => (
          <BoardColumn
            key={column.id}
            id={column.id}
            label={column.label}
            hint={column.hint}
            count={columns[column.id].length}
            questions={columns[column.id]}
            sources={sources}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <article className="w-72 rotate-1 rounded-lg border border-[#163028] bg-white p-3 shadow-xl">
            <p className="line-clamp-3 text-sm font-medium">{active.question}</p>
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  id,
  label,
  hint,
  count,
  questions,
  sources,
  onOpen,
}: {
  id: ColumnId;
  label: string;
  hint: string;
  count: number;
  questions: Question[];
  sources: SourcesMap;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: questions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 104,
    overscan: 10,
    gap: 8,
    getItemKey: (index) => questions[index]?.id ?? index,
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-[min(72vh,46rem)] w-[min(86vw,20rem)] shrink-0 snap-start flex-col rounded-xl border md:w-auto",
        id === "got-wrong"
          ? "border-[#f0b8b5] bg-[#fdf6f5]"
          : id === "getting-there"
            ? "border-[#ead9a0] bg-[#fbf6e8]"
            : id === "mastered"
              ? "border-[#b5d7be] bg-[#f1f8f2]"
              : "border-[#d5ddd4] bg-[#f7f8f4]",
        isOver ? "ring-2 ring-[#163028]" : "",
      )}
    >
      <header className="shrink-0 px-3 pt-3 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{label}</h2>
          <span className="rounded-full bg-white/80 px-2 text-xs font-semibold text-[#3d5247]">
            {count}
          </span>
        </div>
        <p className="text-xs text-[#5b6e63]">{hint}</p>
      </header>
      <div
        ref={scrollRef}
        className="board-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3"
        style={{ overflowAnchor: "none" }}
      >
        {questions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#c5d0c2] px-3 py-6 text-center text-xs text-[#7a8b80]">
            No cards here
          </p>
        ) : (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const question = questions[item.index];
              if (!question) return null;
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <QuestionCard question={question} sources={sources} onOpen={onOpen} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

const QuestionCard = memo(function QuestionCard({
  question,
  sources,
  onOpen,
}: {
  question: Question;
  sources: SourcesMap;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: question.id,
  });
  return (
    <article
      ref={setNodeRef}
      className={cn(
        "rounded-lg border border-[#d5ddd4] bg-[#fffcf7] p-2.5 shadow-sm",
        isDragging ? "opacity-40" : "",
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-[#8a9b90] hover:bg-[#e4eadc] active:cursor-grabbing"
          aria-label="Drag card"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" />
        </button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(question.id)}>
          <p className="line-clamp-3 text-sm leading-snug font-medium text-[#14241c]">
            {question.question}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold tracking-wide text-[#5b6e63] uppercase">
              {CATEGORY_LABELS[question.category as keyof typeof CATEGORY_LABELS] ??
                question.category}
            </span>
            <span className="text-[10px] text-[#8a9b90]">
              {TYPE_LABELS[question.type as keyof typeof TYPE_LABELS] ?? question.type}
            </span>
            <SourceCredit source={question.source} sources={sources} tags={question.tags} />
          </div>
        </button>
      </div>
    </article>
  );
});
