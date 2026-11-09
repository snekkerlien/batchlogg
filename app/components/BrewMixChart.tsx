"use client";

import { useEffect, useId, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { BrewMixEntry } from "@/lib/brewing/brewMix";

type Tone = { light: string; dark: string; glow: string; icon: string };

const TONES: Record<string, Tone> = {
  Beer: { light: "#fde68a", dark: "#d97706", glow: "#f59e0b", icon: "🍺" },
  Mead: { light: "#fcd34d", dark: "#b45309", glow: "#fbbf24", icon: "🍯" },
  Wine: { light: "#fb7185", dark: "#881337", glow: "#e11d48", icon: "🍷" },
  Cider: { light: "#bef264", dark: "#4d7c0f", glow: "#84cc16", icon: "🍏" },
  Braggot: { light: "#fdba74", dark: "#9a3412", glow: "#f97316", icon: "🍻" },
  "Hard Seltzer": { light: "#67e8f9", dark: "#0e7490", glow: "#06b6d4", icon: "🫧" },
  Seltzer: { light: "#67e8f9", dark: "#0e7490", glow: "#06b6d4", icon: "🫧" },
  Other: { light: "#c4b5fd", dark: "#5b21b6", glow: "#8b5cf6", icon: "🧪" },
};
const FALLBACK_TONES: Tone[] = [
  { light: "#93c5fd", dark: "#1d4ed8", glow: "#3b82f6", icon: "🥂" },
  { light: "#f0abfc", dark: "#86198f", glow: "#d946ef", icon: "🥂" },
  { light: "#5eead4", dark: "#0f766e", glow: "#14b8a6", icon: "🥂" },
];

const CENTER = 110;
const RADIUS = 70;
const STROKE = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3;

export default function BrewMixChart({
  mix,
  recipeMix = [],
}: {
  mix: BrewMixEntry[];
  recipeMix?: BrewMixEntry[];
}) {
  const { t } = useTranslation();
  if (mix.length === 0 && recipeMix.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-center text-2xl font-semibold text-green-300">
        {t("Brewing mix")}
      </h2>
      <div className="flex flex-wrap items-start justify-center gap-4">
        <MixDonut mix={mix} title={t("Batches")} />
        <MixDonut mix={recipeMix} title={t("Recipes")} />
      </div>
    </section>
  );
}

function MixDonut({ mix, title }: { mix: BrewMixEntry[]; title: string }) {
  const { t } = useTranslation();
  const uid = useId().replace(/:/g, "");
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  if (mix.length === 0) return null;

  let fallbackIndex = 0;
  let start = 0;
  const segments = mix.map((entry, index) => {
    const tone = TONES[entry.type] ?? FALLBACK_TONES[fallbackIndex++ % FALLBACK_TONES.length];
    const length = (entry.percent / 100) * CIRCUMFERENCE;
    const midAngle = ((start + length / 2) / CIRCUMFERENCE) * 2 * Math.PI - Math.PI / 2;
    const segment = {
      ...entry,
      tone,
      index,
      offset: start,
      length,
      x: CENTER + RADIUS * Math.cos(midAngle),
      y: CENTER + RADIUS * Math.sin(midAngle),
    };
    start += length;
    return segment;
  });

  const focus = segments.find((s) => s.type === hovered) ?? segments[0];

  return (
    <figure className="w-full max-w-[18rem] sm:w-72">
      <figcaption className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-white/70">
        {title}
      </figcaption>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] p-2 shadow-2xl shadow-black/40 backdrop-blur">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-500"
          style={{ backgroundColor: focus.tone.glow, opacity: 0.18 }}
        />
        <svg viewBox="0 0 220 220" className="relative mx-auto h-auto w-full" role="img" aria-label={`${t("Brewing mix")}: ${title}`}>
          <defs>
            {segments.map((s) => (
              <linearGradient key={s.type} id={`${uid}-${s.index}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={s.tone.light} />
                <stop offset="100%" stopColor={s.tone.dark} />
              </linearGradient>
            ))}
            <radialGradient id={`${uid}-hub`} cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#09090b" />
            </radialGradient>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={RADIUS + STROKE / 2 + 3} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="1 4" />
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={STROKE} />

          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {segments.map((s) => {
              const visible = Math.max(s.length - (segments.length > 1 ? GAP : 0), 0.01);
              const active = hovered === s.type;
              return (
                <circle
                  key={s.type}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={`url(#${uid}-${s.index})`}
                  strokeWidth={active ? STROKE + 8 : STROKE}
                  strokeDasharray={`${ready ? visible : 0} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-(s.offset + GAP / 2)}
                  onMouseEnter={() => setHovered(s.type)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    cursor: "pointer",
                    filter: `drop-shadow(0 0 ${active ? 10 : 4}px ${s.tone.glow}${active ? "cc" : "66"})`,
                    transition: `stroke-dasharray 1000ms cubic-bezier(.22,1,.36,1) ${s.index * 140}ms, stroke-width 200ms ease, filter 200ms ease`,
                  }}
                />
              );
            })}
          </g>

          <circle cx={CENTER} cy={CENTER} r={RADIUS - STROKE / 2 - 2} fill={`url(#${uid}-hub)`} stroke="rgba(255,255,255,0.12)" />

          <g
            textAnchor="middle"
            fill="white"
            style={{ opacity: ready ? 1 : 0, transition: "opacity 600ms ease-out 900ms", pointerEvents: "none" }}
          >
            {segments.map((s) =>
              s.percent < 6 ? null : (
                <text
                  key={s.type}
                  x={s.x}
                  y={s.y}
                  dominantBaseline="middle"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.45)", strokeWidth: 2.5, strokeLinejoin: "round" }}
                >
                  {s.percent >= 12 && (
                    <tspan x={s.x} dy="-0.6em"                     fontSize="11" fontWeight="600">{t(s.type)}</tspan>
                  )}
                                      <tspan x={s.x} dy={s.percent >= 12 ? "1.3em" : "0"} fontSize={s.percent >= 12 ? 15 : 11} fontWeight="800">
                    {s.percent}%
                  </tspan>
                </text>
              )
            )}
          </g>
        </svg>
      </div>
    </figure>
  );
}
