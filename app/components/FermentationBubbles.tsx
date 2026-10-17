"use client";

import { useEffect, useState, type CSSProperties } from "react";

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

  useEffect(() => {
    setBubbles(
      Array.from({ length: count }, () => {
        const duration = 1.8 + Math.random() * 0.9;
        return {
          left: 4 + Math.random() * 92,
          duration,
          delay: -(duration * Math.random()),
          size: 3 + Math.random() * 4,
          drift: -8 + Math.random() * 16,
        };
      })
    );
  }, [count]);

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
