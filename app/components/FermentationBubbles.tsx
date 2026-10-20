"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  getReducedMotionPreference,
  REDUCED_MOTION_EVENT,
} from "@/lib/accessibility/reducedMotion";

type Bubble = {
  left: number;
  duration: number;
  delay: number;
  size: number;
  drift: number;
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
        const duration = 3.5;
        return {
          left: 4 + Math.random() * 92,
          duration,
          delay: -(duration * Math.random()),
          size: 3 + Math.random() * 4,
          drift: -8 + Math.random() * 16,
        };
      })
    );

    return () => {
      window.removeEventListener(REDUCED_MOTION_EVENT, updateMotionPreference);
      motionMedia.removeEventListener("change", updateMotionPreference);
    };
  }, [count]);

  if (reducedMotion) return null;

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
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            "--bubble-drift": `${bubble.drift}px`,
          } as CSSProperties & { "--bubble-drift": string }}
        />
      ))}
    </div>
  );
}
