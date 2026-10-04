"use client";

import { useState } from "react";

type ProfileStats = {
  totalBatches: number;
  totalRecipes: number;
  publicRecipes: number;
  forumPosts: number;
};

const TIERS: { stat: keyof ProfileStats; tiers: [string, number][] }[] = [
  {
    stat: "totalBatches",
    tiers: [
      ["First Batch", 1],
      ["Getting Started", 3],
      ["Hooked", 5],
      ["Seasoned Brewer", 10],
      ["Regular Brewer", 15],
      ["Dedicated Brewer", 20],
      ["Cellar Builder", 30],
      ["Brewery Veteran", 50],
      ["Fermentation Fanatic", 70],
      ["Centurion", 100],
      ["Master Brewer", 125],
      ["Brewing Legend", 150],
      ["Cellar Master", 200],
      ["Grand Brewmaster", 250],
      ["Living Legend", 300],
      ["Brewing Immortal", 500],
    ],
  },
  {
    stat: "totalRecipes",
    tiers: [
      ["First Recipe", 1],
      ["Recipe Tinkerer", 3],
      ["Recipe Collector", 5],
      ["10 Recipes Created", 10],
      ["Recipe Crafter", 15],
      ["Recipe Architect", 20],
      ["Recipe Library", 30],
      ["Recipe Archivist", 40],
      ["Recipe Curator", 50],
      ["Recipe Scholar", 60],
      ["Recipe Encyclopedia", 75],
      ["Recipe Sage", 100],
      ["Recipe Grandmaster", 125],
      ["Recipe Mastermind", 150],
    ],
  },
  {
    stat: "publicRecipes",
    tiers: [
      ["First Share", 1],
      ["Generous Brewer", 2],
      ["Open Cellar", 3],
      ["Public Recipe Contributor", 5],
      ["Community Cookbook", 8],
      ["Recipe Philanthropist", 10],
      ["Recipe Benefactor", 15],
      ["Public Library", 20],
      ["Recipe Patron", 30],
      ["Recipe Legend", 50],
    ],
  },
  {
    stat: "forumPosts",
    tiers: [
      ["First Post", 1],
      ["Friendly Voice", 3],
      ["Community Contributor", 10],
      ["Conversation Starter", 20],
      ["Forum Enthusiast", 35],
      ["Community Regular", 50],
      ["Forum Veteran", 100],
      ["Community Pillar", 200],
      ["Forum Legend", 350],
      ["Voice of the Brewery", 500],
    ],
  },
];

const HOW_TO: Record<keyof ProfileStats, (goal: number) => string> = {
  totalBatches: (n) => `Brew and log ${n} ${n === 1 ? "batch" : "batches"} in Batchlog.`,
  totalRecipes: (n) => `Create ${n} ${n === 1 ? "recipe" : "recipes"} in your recipe library.`,
  publicRecipes: (n) => `Make ${n} of your ${n === 1 ? "recipe" : "recipes"} public so others can see ${n === 1 ? "it" : "them"}.`,
  forumPosts: (n) => `Write ${n} ${n === 1 ? "post" : "posts"} in the community forum.`,
};

function ProgressRing({
  ratio,
  unlocked,
  label,
}: {
  ratio: number;
  unlocked: boolean;
  label: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="6" className="stroke-white/10" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className={unlocked ? "stroke-green-400" : "stroke-amber-300/80"}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${
          unlocked ? "text-green-200" : "text-white/70"
        }`}
      >
        {unlocked ? "✓" : label}
      </span>
    </div>
  );
}
export default function ProfileOverview({ stats }: { stats: ProfileStats }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-center text-2xl font-semibold text-green-300">
        Brewing overview
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Batches brewed", stats.totalBatches],
          ["Recipes created", stats.totalRecipes],
          ["Public recipes", stats.publicRecipes],
          ["Forum posts", stats.forumPosts],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
          >
            <dt className="text-xs text-white/55">{label}</dt>
            <dd className="mt-1 break-words text-lg font-semibold text-white">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ProfileAchievements({ stats }: { stats: ProfileStats }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const achievements = TIERS.flatMap(({ stat, tiers }) =>
    tiers.map(([name, goal]) => {
      const progress = stats[stat];
      return {
        name,
        goal,
        progress,
        stat,
        unlocked: progress >= goal,
        ratio: Math.min(progress / goal, 1),
      };
    })
  ).sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.ratio - a.ratio);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const active = achievements.find((a) => a.name === selected) ?? null;

  return (
    <section className="mt-10 rounded-xl border border-white/10 bg-white/5 p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 text-left ${open ? "mb-4" : ""}`}
      >
        <h3 className="text-lg font-semibold text-green-200">Achievements</h3>
        <span className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">
            {unlockedCount} of {achievements.length} unlocked
          </span>
          <span aria-hidden className="text-white/60">
            {open ? "▼" : "◀"}
          </span>
        </span>
      </button>
      {open && (
        <>
          <p className="mb-3 text-center text-xs text-white/45">
            Tap an achievement to see how to earn it.
          </p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {achievements.map((a) => (
              <li key={a.name}>
                <button
                  type="button"
                  onClick={() => setSelected(a.name)}
                  title={HOW_TO[a.stat](a.goal)}
                  className={`flex w-full flex-col items-center gap-1 rounded-lg border border-transparent p-2 transition hover:bg-white/10 ${
                    a.unlocked ? "" : "opacity-80"
                  }`}
                >
                  <ProgressRing
                    ratio={a.ratio}
                    unlocked={a.unlocked}
                    label={`${Math.round(a.ratio * 100)}%`}
                  />
                  <span className="text-center text-[11px] leading-tight text-white/80">
                    {a.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-white/15 bg-zinc-950 p-6 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <ProgressRing
              ratio={active.ratio}
              unlocked={active.unlocked}
              label={`${Math.round(active.ratio * 100)}%`}
            />
            <h4 className="text-xl font-semibold text-white">{active.name}</h4>
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                active.unlocked ? "bg-green-400/15 text-green-200" : "bg-white/5 text-white/50"
              }`}
            >
              {active.unlocked ? "Earned" : "In progress"}
            </span>
            <p className="text-sm text-white/75">
              <span className="font-semibold text-white/90">How to earn: </span>
              {HOW_TO[active.stat](active.goal)}
            </p>
            <p className="text-xs text-white/50">
              Progress: {Math.min(active.progress, active.goal)} / {active.goal}
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-2 rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}