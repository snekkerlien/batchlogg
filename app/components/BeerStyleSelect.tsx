"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { beerStyleOptions } from "@/lib/brewing/beerStyles";

function editDistanceWithinOne(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let differences = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
    } else {
      differences += 1;
      if (differences > 1) return false;
      if (left.length > right.length) leftIndex += 1;
      else if (right.length > left.length) rightIndex += 1;
      else {
        leftIndex += 1;
        rightIndex += 1;
      }
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) differences += 1;
  return differences <= 1;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function matchesBeerStyle(style: string, query: string): boolean {
  const queryTokens = normalizeSearchText(query).match(/[a-z0-9]+/g) ?? [];
  const styleTokens = normalizeSearchText(style).match(/[a-z0-9]+/g) ?? [];
  if (queryTokens.length === 0) return true;

  return queryTokens.every((queryToken) =>
    styleTokens.some(
      (styleToken) =>
        styleToken.startsWith(queryToken) ||
        (queryToken.length >= 5 && editDistanceWithinOne(queryToken, styleToken))
    )
  );
}

export default function BeerStyleSelect({
  id,
  name = "beer_style",
  value,
  onChange,
}: {
  id: string;
  name?: string;
  value: string;
  onChange: (style: string) => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const filteredStyles = useMemo(
    () =>
      searching
        ? beerStyleOptions.filter((style) => matchesBeerStyle(style, query.trim()))
        : beerStyleOptions,
    [query, searching]
  );

  function selectStyle(style: string) {
    onChange(style);
    setQuery(style);
    setSearching(false);
    setOpen(false);
    inputRef.current?.setCustomValidity("");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className="mb-1 block font-semibold">
        Beer style
      </label>
      <input type="hidden" name={name} value={value} />
      <div className="flex">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${listId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          required
          value={query}
          placeholder="Search beer styles"
          onFocus={() => {
            setOpen(true);
            setSearching(false);
          }}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setSearching(true);
            setOpen(true);
            setActiveIndex(0);
            onChange("");
            event.target.setCustomValidity(
              nextQuery ? "Choose a beer style from the list." : ""
            );
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) =>
                Math.min(index + 1, filteredStyles.length - 1)
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && open && filteredStyles[activeIndex]) {
              event.preventDefault();
              selectStyle(filteredStyles[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setQuery(value);
              setSearching(false);
              inputRef.current?.setCustomValidity("");
            }
          }}
          className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-white/20 bg-zinc-900 p-3 text-white"
        />
        <button
          type="button"
          aria-label="Toggle beer styles"
          aria-expanded={open}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setOpen((isOpen) => !isOpen);
            setSearching(false);
          }}
          className="rounded-r-lg border border-white/20 bg-zinc-800 px-4 text-white/75 hover:bg-zinc-700"
        >
          <span
            aria-hidden="true"
            className="mx-auto block h-2 w-2 -translate-y-0.5 rotate-45 border-b-2 border-r-2"
          />
        </button>
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Beer styles"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-white/20 bg-zinc-900 py-1 shadow-xl"
        >
          {filteredStyles.length ? (
            filteredStyles.map((style, index) => (
              <li
                key={style}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={style === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectStyle(style)}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-white/10 ${
                  index === activeIndex ? "bg-white/10" : ""
                }`}
              >
                {style}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-white/55">No matching styles.</li>
          )}
        </ul>
      )}
    </div>
  );
}
