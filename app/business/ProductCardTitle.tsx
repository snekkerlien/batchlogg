"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

export default function ProductCardTitle({ name }: { name: string }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const title = titleRef.current;
    const text = textRef.current;
    if (!title || !text) return;

    const measureOverflow = () => {
      setOverflow(Math.max(0, text.scrollWidth - title.clientWidth));
    };
    measureOverflow();
    let active = true;
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(title);
    observer.observe(text);
    void document.fonts.ready.then(() => {
      if (active) measureOverflow();
    });
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [name]);

  return (
    <h3
      ref={titleRef}
      title={name}
      className="product-card-title mt-1 h-7 min-w-0 overflow-hidden text-lg font-semibold"
    >
      <span
        ref={textRef}
        className="product-card-title__text inline-block whitespace-nowrap"
        style={{ "--title-overflow": `${overflow}px` } as CSSProperties}
      >
        {name}
      </span>
    </h3>
  );
}
