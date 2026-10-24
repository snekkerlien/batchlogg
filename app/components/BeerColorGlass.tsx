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
  const glassGradientId = `${liquidClipId}-glass`;
  const beerGradientId = `${liquidClipId}-beer`;
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
      Array.from({ length: 8 }, (_, index) => {
        const laneWidth = 18 / 8;
        const startX = Math.max(
          15,
          Math.min(
            33,
            15 + laneWidth * (index + 0.5) + (Math.random() * 1.5 - 0.75)
          )
        );
        const duration = 1.7 + Math.random() * 2.1;
        return {
          startX,
          endX: Math.max(15, Math.min(33, startX + (Math.random() * 5 - 2.5))),
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
      className={`beer-color-glass shrink-0 ${compact ? "beer-color-glass--compact h-5 w-4" : "h-[5.5rem] w-[4.125rem]"}`}
    >
      <defs>
        <linearGradient id={glassGradientId} x1="0" x2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.24" />
          <stop offset="0.24" stopColor="white" stopOpacity="0.04" />
          <stop offset="0.76" stopColor="#b9d7e2" stopOpacity="0.02" />
          <stop offset="1" stopColor="#b9d7e2" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={beerGradientId} x1="0" x2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.2" />
          <stop offset="0.3" stopColor={color} />
          <stop offset="0.78" stopColor={color} />
          <stop offset="1" stopColor="#42240f" stopOpacity="0.24" />
        </linearGradient>
        <clipPath id={liquidClipId}>
          <path d="M10 6h28l-3 50H13L10 6Z" />
        </clipPath>
      </defs>
      <path
        d="M9 5h30l-4.5 52.5a3 3 0 0 1-3 2.7h-15a3 3 0 0 1-3-2.7L9 5Z"
        fill={`url(#${glassGradientId})`}
        stroke="rgb(255 255 255 / 75%)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${liquidClipId})`}>
        <path
          d="M9 19h30v40H9V19Z"
          fill={`url(#${beerGradientId})`}
        />
      </g>
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
      <g clipPath={`url(#${liquidClipId})`}>
        <path
          d="M9 6h30v14H9V6Z"
          fill="rgb(255 249 232)"
        />
        <circle cx="16" cy="11" r="1.2" fill="rgb(220 202 162 / 40%)" />
        <circle cx="21" cy="15" r="0.8" fill="rgb(220 202 162 / 35%)" />
        <circle cx="27" cy="10" r="1.1" fill="rgb(220 202 162 / 38%)" />
        <circle cx="33" cy="14" r="1.3" fill="rgb(220 202 162 / 40%)" />
      </g>
      <path
        d="m13 9 3.7 42"
        stroke="rgb(255 255 255 / 35%)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="m36 10-3.5 41"
        stroke="rgb(210 232 242 / 24%)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M9 5h30l-4.5 52.5a3 3 0 0 1-3 2.7h-15a3 3 0 0 1-3-2.7L9 5Z"
        fill="none"
        stroke="rgb(255 255 255 / 75%)"
        strokeWidth="2"
        strokeLinejoin="round"
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
