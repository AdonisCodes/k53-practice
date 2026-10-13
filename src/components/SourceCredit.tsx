import { Badge } from "./ui/badge";
import { creditFor, type SourcesMap } from "../lib/types";

export function SourceCredit({
  source,
  sources,
  tags = [],
}: {
  source: string;
  sources: SourcesMap;
  tags?: string[];
}) {
  const credit = creditFor(source, sources, tags);
  const showLink = source !== "ai" || !!credit.url;
  return (
    <span className="inline-flex items-center gap-1.5">
      {showLink ? (
        credit.url ? (
          <a
            href={credit.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-medium text-[#0b5cab] underline-offset-2 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {credit.label}
          </a>
        ) : (
          <span className="text-xs text-[#3d5247]">{credit.label}</span>
        )
      ) : null}
      {credit.showAi ? <Badge variant="ai">AI</Badge> : null}
    </span>
  );
}
