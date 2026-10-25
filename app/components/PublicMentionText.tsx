"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UnitAwareText } from "@/app/components/Units";
import { parsePublicMentions } from "@/lib/community/mentions";

const MENTION_PATTERN =
  /\[@([^\]\r\n]{1,1000})\]\(batchlogg:\/\/(recipe|batch)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\?context=([^)\r\n]{1,500}))?\)/gi;

function PublicMentionLink({
  href,
  kind,
  label,
  context,
}: {
  href: string;
  kind: string;
  label: string;
  context: string;
}) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [previewPosition, setPreviewPosition] = useState<{ left: number; top: number } | null>(
    null
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  function positionPreview() {
    const wrapper = wrapperRef.current;
    const tooltip = tooltipRef.current;
    if (!wrapper || !tooltip) return;

    const anchor = wrapper.getBoundingClientRect();
    const previewWidth = tooltip.offsetWidth;
    const previewHeight = tooltip.offsetHeight;
    const gutter = 8;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const left = Math.max(
      gutter,
      Math.min(
        anchor.left + (anchor.width - previewWidth) / 2,
        viewportWidth - previewWidth - gutter
      )
    );
    const top =
      anchor.top >= previewHeight + gutter
        ? anchor.top - previewHeight - gutter
        : Math.min(anchor.bottom + gutter, viewportHeight - previewHeight - gutter);

    setPreviewPosition({ left, top: Math.max(gutter, top) });
    setPreviewOpen(true);
  }

  return (
    <>
      <span
        ref={wrapperRef}
        className="inline-flex align-baseline"
        onMouseEnter={positionPreview}
        onMouseLeave={() => setPreviewOpen(false)}
        onFocusCapture={positionPreview}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setPreviewOpen(false);
          }
        }}
      >
      <a
        href={href}
        aria-label={`Open public ${kind}: ${label}${context ? `, ${context}` : ""}`}
        className="inline-flex rounded-md border border-green-400/30 bg-green-950/50 px-1.5 py-0.5 font-medium text-green-200 no-underline transition-colors hover:border-green-300/50 hover:bg-green-900/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
      >
        @{label}
      </a>
      </span>
      {typeof document !== "undefined" &&
        createPortal(
      <span
        ref={tooltipRef}
        role="tooltip"
        aria-hidden={!previewOpen}
        style={
          previewPosition
            ? { position: "fixed", left: previewPosition.left, top: previewPosition.top }
            : { position: "fixed", left: -10000, top: -10000 }
        }
        className={`pointer-events-none z-[100] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-green-300/20 bg-zinc-950/95 p-3 text-left shadow-[0_16px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl transition duration-150 ${
          previewOpen ? "visible translate-y-0 scale-100 opacity-100" : "invisible translate-y-1 scale-95 opacity-0"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-green-300/20 bg-green-400/10 text-green-200">
            {kind === "recipe" ? (
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H16v14H6.5A2.5 2.5 0 0 0 4 18.5v-14Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M4 15.5A2.5 2.5 0 0 1 6.5 13H16M7 5h5M7 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M7 2.5h6M8 2.5v5l-4.5 7.2A2 2 0 0 0 5.2 18h9.6a2 2 0 0 0 1.7-3.3L12 7.5v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.4 13h7.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-green-300/75">
              Public {kind}
            </span>
            <span className="block truncate text-sm font-semibold text-white">{label}</span>
          </span>
        </span>
        {context && (
          <span className="mt-3 inline-flex max-w-full rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/75">
            <span className="truncate">{context}</span>
          </span>
        )}
        <span className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
          <span className="text-white/45">Preview tag</span>
          <span className="font-medium text-green-300">
            Click tag to open <span aria-hidden="true">↗</span>
          </span>
        </span>
          </span>,
          document.body
        )}
    </>
  );
}

export default function PublicMentionText({
  text,
  unitAware = false,
  compactMentions = false,
}: {
  text: string | null | undefined;
  unitAware?: boolean;
  compactMentions?: boolean;
}) {
  const safeText = text ?? "";
  const mentions = parsePublicMentions(safeText);
  if (!mentions.length) {
    return unitAware ? <UnitAwareText text={safeText} /> : safeText;
  }

  const nodes = [];
  let previousIndex = 0;
  let key = 0;
  for (const match of safeText.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    const before = safeText.slice(previousIndex, index);
    if (before) {
      nodes.push(
        unitAware
          ? <UnitAwareText key={key++} text={before} />
          : <span key={key++}>{before}</span>
      );
    }
    let label = match[1];
    try {
      label = decodeURIComponent(label);
    } catch {
      // Keep the stored label if it contains malformed encoding.
    }
    let context = "";
    try {
      context = match[4] ? decodeURIComponent(match[4]) : "";
    } catch {
      context = "";
    }
    const href =
      match[2].toLowerCase() === "recipe"
        ? `/public-recipes/${match[3]}`
        : `/public-batches/${match[3]}`;
    const kind = match[2].toLowerCase();
    if (compactMentions) {
      nodes.push(
        <span
          key={key++}
          title={`${kind === "recipe" ? "Public recipe" : "Public batch"}: ${label}${context ? ` · ${context}` : ""}`}
          className="mx-0.5 inline-flex max-w-full translate-y-0.5 items-center gap-1.5 rounded-md border border-green-300/20 bg-green-300/[0.08] px-1.5 py-0.5 align-baseline text-[11px] leading-4 text-green-100"
        >
          <span className="shrink-0 rounded border border-green-200/15 bg-black/20 px-1 text-[8px] font-bold uppercase tracking-wide text-green-200/75">
            {kind === "recipe" ? "Recipe" : "Batch"}
          </span>
          <span className="min-w-0 truncate font-medium">{label}</span>
        </span>
      );
    } else {
      nodes.push(
        <PublicMentionLink
          key={key++}
          href={href}
          kind={kind}
          label={label}
          context={context}
        />
      );
    }
    previousIndex = index + match[0].length;
  }

  const after = safeText.slice(previousIndex);
  if (after) {
    nodes.push(
      unitAware
        ? <UnitAwareText key={key++} text={after} />
        : <span key={key++}>{after}</span>
    );
  }
  return <>{nodes}</>;
}
