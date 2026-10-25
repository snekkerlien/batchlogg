"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { parsePublicMentions } from "@/lib/community/mentions";

interface MentionChoice {
  type: "recipe" | "batch";
  id: string;
  name: string;
  context: string;
}

interface Trigger {
  type: MentionChoice["type"];
  query: string;
  start: number;
  end: number;
}

function findTrigger(value: string, caret: number): Trigger | null {
  const beforeCaret = value.slice(0, caret);
  const match = /@([rb])([^\s@]*)$/i.exec(beforeCaret);
  if (!match) return null;
  const start = caret - match[0].length;
  if (start > 0 && /[\w@]/.test(value[start - 1])) return null;
  return {
    type: match[1].toLowerCase() === "r" ? "recipe" : "batch",
    query: match[2],
    start,
    end: caret,
  };
}

function displayMentionName(name: string) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function formatMentionText(text: string) {
  return text.replace(
    /\[@([^\]\r\n]{1,1000})\]\(batchlogg:\/\/(recipe|batch)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\?context=[^)\r\n]{1,500})?\)/gi,
    (_match, name: string) => `@${displayMentionName(name)}`
  );
}

function mapDisplayOffsetToStored(
  displayText: string,
  storedText: string,
  offset: number,
  edge: "start" | "end"
) {
  const pattern =
    /\[@([^\]\r\n]{1,1000})\]\(batchlogg:\/\/(recipe|batch)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\?context=[^)\r\n]{1,500})?\)/gi;
  let displayOffset = 0;
  let storedOffset = 0;
  for (const match of storedText.matchAll(pattern)) {
    const index = match.index ?? 0;
    const before = storedText.slice(storedOffset, index);
    const visibleMention = `@${displayMentionName(match[1])}`;
    const mentionStart = displayOffset + before.length;
    const mentionEnd = mentionStart + visibleMention.length;
    if (offset < mentionStart) return storedOffset + offset - displayOffset;
    if (offset === mentionStart) return index;
    if (offset < mentionEnd) {
      return edge === "start" ? index : index + match[0].length;
    }
    if (offset === mentionEnd) return index + match[0].length;
    displayOffset = mentionEnd;
    storedOffset = index + match[0].length;
  }
  return storedOffset + offset - displayOffset;
}

function storeReadableEdit(nextDisplayText: string, previousStoredText: string) {
  const previousDisplayText = formatMentionText(previousStoredText);
  let prefixLength = 0;
  while (
    prefixLength < previousDisplayText.length &&
    prefixLength < nextDisplayText.length &&
    previousDisplayText[prefixLength] === nextDisplayText[prefixLength]
  ) {
    prefixLength += 1;
  }
  let suffixLength = 0;
  while (
    suffixLength < previousDisplayText.length - prefixLength &&
    suffixLength < nextDisplayText.length - prefixLength &&
    previousDisplayText[previousDisplayText.length - suffixLength - 1] ===
      nextDisplayText[nextDisplayText.length - suffixLength - 1]
  ) {
    suffixLength += 1;
  }

  const storedStart = mapDisplayOffsetToStored(
    previousDisplayText,
    previousStoredText,
    prefixLength,
    "start"
  );
  const storedEnd = mapDisplayOffsetToStored(
    previousDisplayText,
    previousStoredText,
    previousDisplayText.length - suffixLength,
    "end"
  );
  return (
    previousStoredText.slice(0, storedStart) +
    nextDisplayText.slice(prefixLength, nextDisplayText.length - suffixLength) +
    previousStoredText.slice(storedEnd)
  );
}

function encodeMentionValue(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export default function PublicMentionTextarea({
  value,
  onChange,
  defaultValue = "",
  className,
  placeholder,
  rows = 3,
  maxLength,
  disabled = false,
  containerClassName = "",
  suggestionPlacement = "below",
  showReadableMentions = false,
  "aria-label": ariaLabel,
  id,
  name,
  required = false,
  onKeyDown,
}: {
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  className: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  containerClassName?: string;
  suggestionPlacement?: "above" | "below";
  showReadableMentions?: boolean;
  "aria-label"?: string;
  id?: string;
  name?: string;
  required?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listboxId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const currentValue = value ?? uncontrolledValue;
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [choices, setChoices] = useState<MentionChoice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const selectedMentions = parsePublicMentions(currentValue);
  const displayedValue = showReadableMentions
    ? formatMentionText(currentValue)
    : currentValue;

  useEffect(() => {
    if (!trigger) {
      setChoices([]);
      setSuggestionError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSuggestionError("");
      try {
        const params = new URLSearchParams({
          type: trigger.type,
          search: trigger.query,
        });
        const response = await fetch(`/api/community/mentions?${params}`, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load public tags.");
        setChoices(data.mentions);
        setSelectedIndex(0);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Could not load public mention suggestions", error);
        setChoices([]);
        setSuggestionError(
          error instanceof Error ? error.message : "Could not load public tags."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trigger]);

  function updateTrigger(value: string, caret: number) {
    setTrigger(findTrigger(value, caret));
  }

  function updateValue(nextValue: string) {
    if (maxLength && nextValue.length > maxLength) {
      setSuggestionError("The text limit has been reached.");
      return false;
    }
    setSuggestionError("");
    if (value === undefined) setUncontrolledValue(nextValue);
    onChange?.(nextValue);
    return true;
  }

  function choose(choice: MentionChoice) {
    if (!trigger) return;
    const encodedName = encodeMentionValue(choice.name);
    const encodedContext = encodeMentionValue(choice.context);
    const mention = `[@${encodedName}](batchlogg://${choice.type}/${choice.id}?context=${encodedContext})`;
    const storedStart = showReadableMentions
      ? mapDisplayOffsetToStored(displayedValue, currentValue, trigger.start, "start")
      : trigger.start;
    const storedEnd = showReadableMentions
      ? mapDisplayOffsetToStored(displayedValue, currentValue, trigger.end, "end")
      : trigger.end;
    const nextValue =
      currentValue.slice(0, storedStart) + mention + currentValue.slice(storedEnd);
    if (maxLength && nextValue.length > maxLength) {
      setSuggestionError("Selecting this tag would exceed the text limit. Shorten your message first.");
      return;
    }
    updateValue(nextValue);
    setTrigger(null);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const caret = trigger.start + `@${choice.name}`.length;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className={`relative ${containerClassName}`}>
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        aria-label={ariaLabel}
        aria-controls={trigger ? listboxId : undefined}
        aria-activedescendant={
          trigger && choices.length ? `${listboxId}-option-${selectedIndex}` : undefined
        }
        required={required}
        value={displayedValue}
        onChange={(event) => {
          const nextValue = showReadableMentions
            ? storeReadableEdit(event.target.value, currentValue)
            : event.target.value;
          if (!updateValue(nextValue)) return;
          updateTrigger(event.target.value, event.target.selectionStart);
        }}
        onClick={(event) => updateTrigger(event.currentTarget.value, event.currentTarget.selectionStart)}
        onKeyUp={(event) => {
          if (!["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)) {
            updateTrigger(event.currentTarget.value, event.currentTarget.selectionStart);
          }
        }}
        onKeyDown={(event) => {
          if (trigger && (choices.length || loading)) {
            if (event.key === "ArrowDown" && choices.length) {
              event.preventDefault();
              setSelectedIndex((index) => (index + 1) % choices.length);
              return;
            } else if (event.key === "ArrowUp" && choices.length) {
              event.preventDefault();
              setSelectedIndex((index) => (index + choices.length - 1) % choices.length);
              return;
            } else if (event.key === "Enter" && choices[selectedIndex]) {
              event.preventDefault();
              choose(choices[selectedIndex]);
              return;
            } else if (event.key === "Escape") {
              event.preventDefault();
              setTrigger(null);
              return;
            }
          }
          onKeyDown?.(event);
        }}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      {selectedMentions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/55">Tagged:</span>
          {selectedMentions.map((mention, index) => (
            <Fragment key={`${mention.type}:${mention.id}:${index}`}>
            <Link
              href={
                mention.type === "recipe"
                  ? `/public-recipes/${mention.id}`
                  : `/public-batches/${mention.id}`
              }
              title={mention.context ? `${displayMentionName(mention.name)} · ${mention.context}` : undefined}
              className="inline-flex rounded-md border border-green-400/30 bg-green-950/50 px-1.5 py-0.5 font-medium text-green-200 no-underline transition-colors hover:border-green-300/50 hover:bg-green-900/70 hover:text-white"
            >
              @{displayMentionName(mention.name)}
            </Link>
            {mention.context && (
              <span className="text-white/50">
                {mention.context}
              </span>
            )}
            </Fragment>
          ))}
        </div>
      )}
      {trigger && (loading || choices.length > 0 || suggestionError) && (
        <div
          className={`absolute z-50 w-full overflow-hidden rounded-xl border border-white/15 bg-zinc-950/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl ${
            suggestionPlacement === "above" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-2 pb-2">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
              Public {trigger.type === "recipe" ? "recipes" : "batches"}
            </span>
            <span className="text-[10px] text-white/35">↑↓ navigate · ↵ select · esc close</span>
          </div>
          <ul
            id={listboxId}
            role="listbox"
            aria-label={trigger.type === "recipe" ? "Public recipes" : "Public batches"}
            className="max-h-56 space-y-1 overflow-y-auto pt-1"
          >
            {loading && (
              <li className="flex items-center gap-2 px-3 py-3 text-sm text-white/60">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-green-300" />
                Finding public {trigger.type === "recipe" ? "recipes" : "batches"}…
              </li>
            )}
            {suggestionError && (
              <li role="alert" className="rounded-lg bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                {suggestionError}
              </li>
            )}
            {choices.map((choice, index) => (
              <li
                key={`${choice.type}:${choice.id}`}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(choice)}
                  className={`group/choice flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition duration-150 ${
                    index === selectedIndex
                      ? "border-green-300/25 bg-gradient-to-r from-green-400/15 to-emerald-300/[0.04] text-white shadow-[inset_2px_0_0_rgba(134,239,172,0.85)]"
                      : "border-transparent text-white/80 hover:border-white/10 hover:bg-white/[0.05]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      index === selectedIndex
                        ? "border-green-300/25 bg-green-300/10 text-green-200"
                        : "border-white/10 bg-white/[0.04] text-white/45 group-hover/choice:text-green-200"
                    }`}
                  >
                    {choice.type === "recipe" ? (
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
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{choice.name}</span>
                    <span className={`mt-0.5 block truncate text-xs ${
                      index === selectedIndex ? "text-green-100/65" : "text-white/45"
                    }`}>
                      {choice.context}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      index === selectedIndex
                        ? "border-green-200/20 bg-green-200/10 text-green-100"
                        : "border-white/10 text-white/35"
                    }`}
                  >
                    ↵
                  </span>
                </button>
              </li>
            ))}
            {!loading && !suggestionError && choices.length === 0 && (
              <li className="px-3 py-4 text-sm text-white/55">
                No public {trigger.type === "recipe" ? "recipes" : "batches"} found.
              </li>
            )}
          </ul>
        </div>
      )}
      {!trigger && suggestionError && (
        <p role="alert" className="mt-1 text-xs text-amber-200">
          {suggestionError}
        </p>
      )}
      <p className="mt-1 text-xs text-white/45">
        Type <kbd className="rounded border border-white/20 px-1">@r</kbd> for public recipes or{" "}
        <kbd className="rounded border border-white/20 px-1">@b</kbd> for public batches. Use ↑↓ to select, Enter to tag, Esc to close.
      </p>
    </div>
  );
}
