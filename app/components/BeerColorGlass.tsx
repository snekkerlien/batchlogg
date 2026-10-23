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
        d="M11.5 24v-4.5c0-1.7 1.3-3 3-3h19c1.7 0 3 1.3 3 3V24H11.5Z"
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
