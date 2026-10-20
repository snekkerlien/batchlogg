"use client";

import { useEffect, useId, useState } from "react";
import {
  getReducedMotionPreference,
  REDUCED_MOTION_EVENT,
} from "@/lib/accessibility/reducedMotion";

type CarbonationBubble = {
  startX: number;
  endX: number;
  radius: number;
  duration: number;
  delay: number;
};

function ebcToHex(ebc: number): string {
  if (!Number.isFinite(ebc) || ebc <= 0) return "#F3F3F3";
  const srm = ebc / 1.97;
  const channels = [
    255 * Math.pow(0.975, srm),
    245 * Math.pow(0.88, srm),
    220 * Math.pow(0.7, srm),
  ];
  return `#${channels
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

export default function BeerColorGlass({
  ebc,
  compact = false,
}: {
  ebc: number;
  compact?: boolean;
}) {
  const color = ebcToHex(ebc);
  const liquidClipId = useId();
  const [bubbles, setBubbles] = useState<CarbonationBubble[]>([]);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const updateMotionPreference = () =>
      setReducedMotion(getReducedMotionPreference());
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    updateMotionPreference();
    window.addEventListener(REDUCED_MOTION_EVENT, updateMotionPreference);
    motionMedia.addEventListener("change", updateMotionPreference);

    setBubbles(
      Array.from({ length: 8 }, () => {
        const startX = 14 + Math.random() * 20;
        const duration = 1.7 + Math.random() * 2.1;
        return {
          startX,
          endX: Math.max(14, Math.min(34, startX + (Math.random() * 5 - 2.5))),
          radius: 0.55 + Math.random() * 0.75,
          duration,
          delay: -(Math.random() * duration),
        };
      })
    );

    return () => {
      window.removeEventListener(REDUCED_MOTION_EVENT, updateMotionPreference);
      motionMedia.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  return (
    <svg
      role="img"
      aria-label={`${Math.round(ebc)} EBC beer color`}
      viewBox="0 0 48 64"
      className={`beer-color-glass shrink-0 ${compact ? "beer-color-glass--compact h-5 w-4" : "h-12 w-9"}`}
    >
      <defs>
        <clipPath id={liquidClipId}>
          <path d="M12 23h24l-2.8 32H14.8L12 23Z" />
        </clipPath>
      </defs>
      <path
        d="M9 5h30l-4.5 52.5a3 3 0 0 1-3 2.7h-15a3 3 0 0 1-3-2.7L9 5Z"
        fill="rgb(255 255 255 / 5%)"
        stroke="rgb(255 255 255 / 75%)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 23h24l-2.8 32H14.8L12 23Z"
        fill={color}
        stroke="rgb(255 255 255 / 18%)"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${liquidClipId})`} fill="rgb(255 255 255 / 70%)">
        {!reducedMotion && bubbles.map((bubble, index) => (
          <circle
            key={index}
            cx={bubble.startX}
            cy="53"
            r={bubble.radius}
          >
            <animate
              attributeName="cy"
              from="53"
              to="27"
              dur={`${bubble.duration}s`}
              begin={`${bubble.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cx"
              from={String(bubble.startX)}
              to={String(bubble.endX)}
              dur={`${bubble.duration}s`}
              begin={`${bubble.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.8;0.55;0"
              keyTimes="0;0.12;0.72;1"
              dur={`${bubble.duration}s`}
              begin={`${bubble.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </g>
      <path
        d="M12 23c-.2-1.8 1.2-3.2 3-3.2.2-2.1 2-3.6 4-3.2 1.2-2.1 4.1-2.3 5.6-.4 1.8-1.5 4.6-.8 5.4 1.4 2.2-.3 3.9 1.3 3.8 3.3 1.5.4 2.3 1.6 2.2 3.2l-.2 2.8-1.1 2.7c-1.7-1.8-3.2-1.8-4.8 0-1.4-2.4-3.4-2.4-4.8 0-1.4-2.5-3.4-2.5-4.8 0-1.4-2.4-3.5-2.4-4.9 0-1.5-2.3-3.4-2.3-4.9 0l-.8-2.7L12 23Z"
        fill="rgb(255 255 255 / 94%)"
      />
      <path
        d="m13 9 3.7 42"
        stroke="rgb(255 255 255 / 35%)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 57h14"
        stroke="rgb(255 255 255 / 55%)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
