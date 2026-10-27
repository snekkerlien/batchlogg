"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  getReducedMotionPreference,
  REDUCED_MOTION_EVENT,
} from "@/lib/accessibility/reducedMotion";

type Bubble = {
  left: number;
  bottom: number;
  duration: number;
  delay: number;
  size: number;
  drift: number;
  peakOpacity: number;
};

export default function FermentationBubbles({
  variant = "vessel",
  count = 6,
}: {
  variant?: "vessel" | "viewport";
  count?: number;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const updateMotionPreference = () =>
      setReducedMotion(getReducedMotionPreference());
    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    updateMotionPreference();
    window.addEventListener(REDUCED_MOTION_EVENT, updateMotionPreference);
    motionMedia.addEventListener("change", updateMotionPreference);

    setBubbles(
      Array.from({ length: count }, () => {
        const duration = 2.4 + Math.random() * 3.2;
        return {
          left: 4 + Math.random() * 92,
          bottom: 8 + Math.random() * 72,
          duration,
          delay: -(duration * Math.random()),
          size: (variant === "vessel" ? 3 : 2) + Math.random() * 6,
          drift: -12 + Math.random() * 24,
          peakOpacity: 0.24 + Math.random() * 0.22,
        };
      })
    );

    return () => {
      window.removeEventListener(REDUCED_MOTION_EVENT, updateMotionPreference);
      motionMedia.removeEventListener("change", updateMotionPreference);
    };
  }, [count, variant]);

  if (reducedMotion && variant === "viewport") return null;

  return (
    <div
      className={`fermentation-bubble-container fermentation-bubble-container--${variant}`}
      aria-hidden="true"
    >
      {bubbles.map((bubble, index) => (
        <span
          key={index}
          className="fermentation-bubble"
          style={{
            left: `${bubble.left}%`,
            animation: reducedMotion ? "none" : undefined,
            bottom: reducedMotion ? `${bubble.bottom}%` : undefined,
            opacity: reducedMotion ? 0.38 : undefined,
            transform: reducedMotion ? "scale(1)" : undefined,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            "--bubble-drift": `${bubble.drift}px`,
            "--bubble-peak-opacity": bubble.peakOpacity,
            "--bubble-duration": `${bubble.duration}s`,
            "--bubble-delay": `${bubble.delay}s`,
          } as CSSProperties & {
            "--bubble-drift": string;
            "--bubble-peak-opacity": number;
            "--bubble-duration": string;
            "--bubble-delay": string;
          }}
        />
      ))}
    </div>
  );
}
