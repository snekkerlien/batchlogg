"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image, { type ImageProps } from "next/image";
import {
  getAccessibleAccentStyle,
  isAccentColor,
} from "@/lib/theme/accentColor";
import archiveAccent from "../../icons_achievements/ach_acc_archive.svg";
import booksAccent from "../../icons_achievements/ach_acc_books.svg";
import checkmarkAccent from "../../icons_achievements/ach_acc_checkmark.svg";
import cogwheelsAccent from "../../icons_achievements/ach_acc_cogwheels.svg";
import crownAccent from "../../icons_achievements/ach_acc_crown.svg";
import fireAccent from "../../icons_achievements/ach_acc_fire.svg";
import heartAccent from "../../icons_achievements/ach_acc_heart.svg";
import hexagonAccent from "../../icons_achievements/ach_acc_hexagon.svg";
import infinityAccent from "../../icons_achievements/ach_acc_infinity.svg";
import keyAccent from "../../icons_achievements/ach_acc_key.svg";
import laurelsAccent from "../../icons_achievements/ach_acc_laurels.svg";
import lightbulbAccent from "../../icons_achievements/ach_acc_lightbulb.svg";
import medalAccent from "../../icons_achievements/ach_acc_medal.svg";
import microphoneAccent from "../../icons_achievements/ach_acc_microphone.svg";
import penAccent from "../../icons_achievements/ach_acc_pen.svg";
import peopleAccent from "../../icons_achievements/ach_acc_people.svg";
import plusAccent from "../../icons_achievements/ach_acc_plus.svg";
import shareAccent from "../../icons_achievements/ach_acc_share.svg";
import shieldAccent from "../../icons_achievements/ach_acc_shield.svg";
import starAccent from "../../icons_achievements/ach_acc_star.svg";
import trophyAccent from "../../icons_achievements/ach_acc_trophy.svg";
import brewCategory from "../../icons_achievements/ach_brew.svg";
import forumCategory from "../../icons_achievements/ach_forum.svg";
import recipesCategory from "../../icons_achievements/ach_recepies.svg";

type ProfileStats = {
  totalBatches: number;
  totalRecipes: number;
  publicRecipes: number;
  forumPosts: number;
};

type Achievement = {
  name: string;
  goal: number;
  progress: number;
  stat: keyof ProfileStats;
  category: string;
  tierIndex: number;
  unlocked: boolean;
  ratio: number;
};

const CATEGORIES: {
  name: string;
  stat: keyof ProfileStats;
  tiers: [string, number][];
}[] = [
  {
    name: "Brewing",
    stat: "totalBatches",
    tiers: [
      ["First Batch", 1],
      ["Brew Day Regular", 5],
      ["Kettle Companion", 10],
      ["Brew Rhythm", 20],
      ["Steady Ferment", 35],
      ["Batch Fifty", 50],
      ["Brewery Regular", 75],
      ["Century of Brews", 100],
      ["Kettle Keeper", 150],
      ["Brew Enthusiast", 200],
      ["Cellar Builder", 300],
      ["Seasoned Brewer", 500],
      ["Fermentation Fanatic", 750],
      ["Grand Brewmaster", 1000],
      ["Brewing Legend", 2000],
    ],
  },
  {
    name: "Recipe craft",
    stat: "totalRecipes",
    tiers: [
      ["First Recipe", 1],
      ["Recipe Tinkerer", 5],
      ["Recipe Notebook", 10],
      ["Recipe Developer", 20],
      ["Recipe Architect", 35],
      ["Recipe Collector", 50],
      ["Recipe Library", 75],
      ["Recipe Designer", 100],
      ["Recipe Curator", 150],
      ["Recipe Master", 200],
      ["Recipe Archive", 300],
      ["Recipe Sage", 500],
    ],
  },
  {
    name: "Sharing",
    stat: "publicRecipes",
    tiers: [
      ["First Share", 1],
      ["Generous Brewer", 5],
      ["Recipe Friend", 10],
      ["Open Cellar", 20],
      ["Open Recipe Shelf", 35],
      ["Shared Inspiration", 50],
      ["Community Cookbook", 75],
      ["Recipe Advocate", 100],
      ["Recipe Ambassador", 150],
      ["Shared Cellar", 200],
      ["Open Source Cellar", 300],
      ["The Great Recipe Exchange", 500],
    ],
  },
  {
    name: "Community",
    stat: "forumPosts",
    tiers: [
      ["First Conversation", 1],
      ["Friendly Voice", 5],
      ["Conversation Starter", 10],
      ["Community Contributor", 25],
      ["Helpful Regular", 50],
      ["Brewing Buddy", 75],
      ["Community Regular", 100],
      ["Welcoming Presence", 150],
      ["Forum Veteran", 250],
      ["Community Guide", 400],
      ["Community Pillar", 600],
      ["Community Champion", 1000],
    ],
  },
];

const HOW_TO: Record<keyof ProfileStats, (goal: number) => string> = {
  totalBatches: (n) => `Brew and log ${n} ${n === 1 ? "batch" : "batches"} in Batchlog.`,
  totalRecipes: (n) => `Create ${n} ${n === 1 ? "recipe" : "recipes"} in your recipe library.`,
  publicRecipes: (n) => `Make ${n} of your ${n === 1 ? "recipe" : "recipes"} public so others can see ${n === 1 ? "it" : "them"}.`,
  forumPosts: (n) => `Write ${n} ${n === 1 ? "post" : "posts"} in the community forum.`,
};

function ProgressionIcon({
  stat,
  tierIndex,
}: {
  stat: keyof ProfileStats;
  tierIndex: number;
}) {
  let subject: ReactNode;

  switch (stat) {
    case "totalBatches":
      switch (tierIndex) {
        case 0:
          subject = <><path d="M17 14h14v24H17zM14 14h20m-13 6h12m-12 6h12m-12 6h12" /><path d="M21 10h6v4h-6z" /></>;
          break;
        case 1:
          subject = <><path d="M13 15h17v16a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5V15Z" /><path d="M30 19h3a5 5 0 0 1 0 10h-3M13 15h17m-13 5c2-3 6-3 8 0m-8 7h8" /><path d="M18 11c1-2 3-2 4 0m2-2c1-2 3-2 4 0" /></>;
          break;
        case 2:
          subject = <><path d="M24 36V19m0 8c-5 0-8-4-8-9 5 0 8 4 8 9Zm0-5c0-6 4-10 10-10 0 6-4 10-10 10Zm0-3c-5-1-8-5-8-10 5 1 8 5 8 10Z" /><path d="M17 36h14" /></>;
          break;
        case 3:
          subject = <><path d="M13 33h22m-17-3 6-18 8 18m-11-7h9" /><path d="M21 12h6m-3-4v4m-7 26h14" /></>;
          break;
        case 4:
          subject = <><path d="M16 13c0 4 2 7 2 12s-2 7-2 12m16-24c0 4-2 7-2 12s2 7 2 12M16 13h16M16 37h16m-14-7h12m-12-10h12" /><path d="M22 13V9h4v4" /></>;
          break;
        case 5:
          subject = <><path d="M17 14h14v23H17zM14 14h20m-17 6h14m-14 12h14" /><path d="M12 25a12 12 0 0 1 3-7m18 0a12 12 0 0 1 3 7m-24 0 3-3m-3 3 4 1m18 5a12 12 0 0 1-3 6m-18 0a12 12 0 0 1-3-6m24 0-3 3m3-3-4-1" /></>;
          break;
        case 7:
          subject = <><path d="M13 17h22l-3 19H16l-3-19Zm4 0v-4h14v4" /><path d="M17 24h14m-12 6h10m-5-17V9" /><path d="M18 36h12" /></>;
          break;
        case 8:
          subject = <><path d="M14 18h20v18H14zM11 18h26m-19-4h12m-15 4v-4m20 4v-4" /><path d="M18 24h12m-12 6h12m-6-16V9" /></>;
          break;
        case 9:
          subject = <><path d="M13 19h22v4H13zm3 4v13m16-13v13M11 36h26" /><path d="M18 19v-5h12v5m-6-5V9m-4 5-3-3m11 3 3-3" /><path d="M20 28h8" /></>;
          break;
        case 10:
          subject = <><path d="M13 17h22v16l-11 6-11-6V17Z" /><path d="M13 23h22m-22 7h22m-11-13v22m-7-22 4 6m10-6-4 6" /></>;
          break;
        case 11:
          subject = <><path d="M24 11c-4 4-10 8-10 15a10 10 0 0 0 20 0c0-7-6-11-10-15Z" /><path d="M19 28c2 2 8 2 10 0m-5-17V7m-8 20 3-2m13 2-3-2" /></>;
          break;
        case 12:
          subject = <><path d="M15 17h18v17l-9 5-9-5V17Z" /><path d="M15 22h18m-18 6h18m-9-11v22" /><circle cx="20" cy="12" r="1" /><circle cx="27" cy="10" r="1.5" /><circle cx="33" cy="13" r="1" /></>;
          break;
        default:
          subject = <><path d="M16 36V20l8-7 8 7v16H16Z" /><path d="M20 36V24h8v12m-12-16h16" /><path d="m19 12 2-3m6 3 2-3" /></>;
      }
      break;
    case "totalRecipes":
      switch (tierIndex) {
        case 0:
          subject = <><path d="M12 14c5-2 9-1 12 2 3-3 7-4 12-2v21c-5-2-9-1-12 2-3-3-7-4-12-2V14Z" /><path d="M24 16v21m-8-16c2-.5 4-.3 5 0m7 0c2-.5 4-.5 5 0" /></>;
          break;
        case 1:
          subject = <><path d="M15 12h18v25H15zM19 18h10m-10 5h10m-10 5h7" /><path d="m29 12 4 4" /></>;
          break;
        case 2:
          subject = <><path d="M13 16h22v20H13zM17 21h14m-14 5h10m-10 5h7" /><path d="m17 16 2-5h10l2 5" /></>;
          break;
        case 3:
          subject = <><path d="M13 13h8v24h-8zm13-3h9v27h-9z" /><path d="M14 19h6m-6 5h6m7-8h7m-7 5h7m-7 5h7" /></>;
          break;
        case 4:
          subject = <><path d="M12 13h20v25H12z" /><path d="M16 19h12m-12 5h12m-12 5h8" /><path d="m31 31 6-15m-4 11 4 1m-5-15 3 3" /></>;
          break;
        case 5:
          subject = <><path d="M13 13h22v24H13z" /><path d="M17 19h14m-14 5h14m-14 5h9" /><path d="m17 10 2-3m10 3 2-3" /></>;
          break;
        case 7:
          subject = <><path d="M13 13c4-2 8-1 11 2 3-3 7-4 11-2v21c-4-2-8-1-11 2-3-3-7-4-11-2V13Z" /><path d="M24 15v21m-7-16h4m7 0h4m-15 5h4m7 0h4" /><path d="m31 11 5-5m-2 0h2v2" /></>;
          break;
        case 8:
          subject = <><path d="M13 35h22m-18-4V17h14v14m-11-11h8m-8 5h8" /><path d="M16 17l3-6h10l3 6m-8-6V8" /></>;
          break;
        default:
          subject = <><path d="M14 14c5-2 8-1 10 2v21c-2-3-5-4-10-2V14Zm20 0c-5-2-8-1-10 2v21c2-3 5-4 10-2V14Z" /><path d="m18 11 3-3m9 3 3-3" /></>;
      }
      break;
    case "publicRecipes":
      switch (tierIndex) {
        case 0:
          subject = <><path d="M12 14c5-2 9-1 12 2 3-3 7-4 12-2v21c-5-2-9-1-12 2-3-3-7-4-12-2V14Z" /><path d="M24 16v21m-7-16h4m7 0h4" /><path d="M29 10h8m-4-4 4 4-4 4" /></>;
          break;
        case 1:
          subject = <><path d="M11 15c4-2 8-1 11 1v18c-3-2-7-3-11-1V15Zm26 0c-4-2-8-1-11 1v18c3-2 7-3 11-1V15Z" /><path d="M22 20h4m-4 5h4m-4 5h4m-1-12 9-5m-3 0h3v3" /></>;
          break;
        case 2:
          subject = <><circle cx="16" cy="18" r="4" /><circle cx="32" cy="18" r="4" /><path d="M9 36c0-6 2-10 7-10s7 4 7 10m16 0c0-6-2-10-7-10s-7 4-7 10" /><path d="M20 18h8m-4-4v8" /></>;
          break;
        case 4:
          subject = <><path d="M13 18h22M15 18v18h18V18M12 36h24" /><path d="M18 14h12m-11 9h12m-12 6h12" /><path d="m32 11 5-5m-2 0h2v2" /></>;
          break;
        case 3:
          subject = <><path d="M24 37s-12-7-12-16a7 7 0 0 1 12-5 7 7 0 0 1 12 5c0 9-12 16-12 16Z" /><path d="M17 23h4l2-4 3 9 2-5h3" /></>;
          break;
        case 5:
          subject = <><path d="M14 14h20v22H14z" /><path d="M18 20h12m-12 5h9" /><path d="m24 28 2 3 4 .5-3 3 .6 4-3.6-2-3.6 2 .6-4-3-3 4-.5 2-3Z" /></>;
          break;
        case 7:
          subject = <><path d="M12 18h24v18H12z" /><path d="M16 23h16m-16 5h9" /><path d="M17 18c0-5 3-8 7-8s7 3 7 8m-7-8V7" /></>;
          break;
        case 8:
          subject = <><path d="M13 13h22v24H13z" /><path d="M17 19h14m-14 5h10m-10 5h7" /><path d="m31 8 1.5 3.5L36 13l-3.5 1.5L31 18l-1.5-3.5L26 13l3.5-1.5L31 8Z" /></>;
          break;
        case 9:
          subject = <><path d="M12 30c4-2 8-2 12 1 4-3 8-3 12-1v6c-4-2-8-2-12 1-4-3-8-3-12-1v-6Z" /><path d="M24 31v7m-8-19h16m-8-9v9m-4-5 4-4 4 4" /></>;
          break;
        case 10:
          subject = <><circle cx="24" cy="23" r="12" /><path d="M12 23h24m-12-12c5 5 5 19 0 24m0-24c-5 5-5 19 0 24" /><path d="M18 35c2 2 4 3 6 3s4-1 6-3" /></>;
          break;
        default:
          subject = <><path d="M24 36V18m0 8c-6 0-9-4-9-10 6 0 9 4 9 10Zm0-4c0-7 4-11 11-11 0 7-4 11-11 11Z" /><path d="M17 36h14m-10-4-5 4m15-4 5 4" /></>;
      }
      break;
    case "forumPosts":
      switch (tierIndex) {
        case 0:
          subject = <><path d="M11 13h26v18H23l-8 6v-6h-4V13Z" /><path d="M17 20h14m-14 5h10" /></>;
          break;
        case 1:
          subject = <><circle cx="24" cy="16" r="5" /><circle cx="13" cy="20" r="4" /><circle cx="35" cy="20" r="4" /><path d="M14 36c0-7 4-11 10-11s10 4 10 11m-23-2c0-5 2-8 6-9m21 9c0-5-2-8-6-9" /></>;
          break;
        case 2:
          subject = <><path d="M10 14h19v15H18l-6 5v-5h-2V14Zm14 7h14v14h-5l-5 4v-4h-4" /><path d="M15 20h9m-9 5h6m8 2h6" /></>;
          break;
        case 3:
          subject = <><path d="M12 14h24v17H23l-7 5v-5h-4V14Z" /><path d="M17 20h14m-14 5h10" /><path d="m31 10 1.5 3.5L36 15l-3.5 1.5L31 20l-1.5-3.5L26 15l3.5-1.5L31 10Z" /></>;
          break;
        case 5:
          subject = <><path d="M11 14h20v14h-9l-6 5v-5h-5V14Zm11 8h15v12h-5l-5 4v-4h-5" /><path d="M16 20h10m-10 5h6m6 3h5" /><path d="m18 11 2 2 4-4" /></>;
          break;
        case 7:
          subject = <><path d="M13 35V24a11 11 0 0 1 22 0v11H13Z" /><path d="M18 35V24a6 6 0 0 1 12 0v11m-17 0h22" /><path d="M20 18h8" /></>;
          break;
        case 9:
          subject = <><path d="m11 17 9-4 8 4 9-4v19l-9 4-8-4-9 4V17Zm9-4v19m8-15v19" /><path d="m15 25 4-4 4 3 5-5m0 0h4m-4 0v4" /></>;
          break;
        case 11:
          subject = <><path d="M17 12h14v11a7 7 0 0 1-14 0V12Z" /><path d="M17 16h-5v3a7 7 0 0 0 6 7m14-10h5v3a7 7 0 0 1-6 7M24 30v6m-8 4h16m-12-4h8" /><path d="m20 17 4-3 4 3" /></>;
          break;
        default:
          subject = <><path d="M11 25v-4a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v5-3a2 2 0 0 1 4 0v9a7 7 0 0 1-7 7h-2c-3 0-5-1-7-4l-4-6a2 2 0 0 1 3-3l2 2" /><path d="m32 15 2 2 4-5" /></>;
      }
      break;
  }

  return subject;
}

function AchievementIcon({
  name,
  stat,
  unlocked,
  className = "h-11 w-11",
}: {
  name: string;
  stat: keyof ProfileStats;
  unlocked: boolean;
  className?: string;
}) {
  const categoryIcon = CATEGORY_ICONS[stat];
  const accentIcon = ACHIEVEMENT_ACCENTS[name];
  const customAccent = CUSTOM_ACHIEVEMENT_ACCENTS[name];
  return (
    <span
      className={`${className} relative block shrink-0 ${
        unlocked ? "" : "opacity-70 grayscale"
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 950.02 919.74" className="h-full w-full">
        <circle cx="458.87" cy="459.87" r="449.87" fill="var(--user-accent)" />
        <path
          d="M909.58,459.87c0,248.45-201.42,449.87-449.87,449.87S19.13,717.48,10.16,476.93c331.55-23.85,435.56-177.37,668.38-189.61,58.39-3.07,124.9,2.75,205.13,21.75,16.78,47.14,25.91,97.9,25.91,150.8Z"
          fill="color-mix(in srgb, var(--user-accent) 78%, black)"
          stroke="color-mix(in srgb, var(--user-accent) 45%, white)"
          strokeWidth="15"
          strokeLinejoin="round"
        />
        <circle
          cx="459.87"
          cy="459.87"
          r="449.87"
          fill="none"
          stroke="#282828"
          strokeWidth="20"
        />
      </svg>
      <span className="absolute left-[12%] top-[12%] h-[76%] w-[76%]">
        <Image
          src={categoryIcon}
          alt=""
          fill
          sizes="48px"
          className="object-contain"
          unoptimized
        />
      </span>
      <span
        className="absolute bottom-[2%] right-[2%] flex h-[42%] w-[42%] items-center justify-center rounded-full border-2 border-[#282828] p-[3%] shadow-md"
        style={{
          backgroundColor: "color-mix(in srgb, var(--user-accent) 45%, black)",
        }}
      >
        {accentIcon ? (
          <span className="relative block h-full w-full">
            <Image
              src={accentIcon}
              alt=""
              fill
              sizes="32px"
              className="object-contain invert"
              unoptimized
            />
          </span>
        ) : (
          <svg
            viewBox="6 6 36 36"
            className="h-full w-full text-white"
            fill="currentColor"
            stroke="#282828"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {customAccent}
          </svg>
        )}
      </span>
    </span>
  );
}

const CATEGORY_ICONS: Record<keyof ProfileStats, ImageProps["src"]> = {
  totalBatches: brewCategory,
  totalRecipes: recipesCategory,
  publicRecipes: recipesCategory,
  forumPosts: forumCategory,
};

const ACHIEVEMENT_ACCENTS: Record<string, ImageProps["src"]> = {
  "Brew Day Regular": fireAccent,
  "Brew Rhythm": cogwheelsAccent,
  "Steady Ferment": infinityAccent,
  "Century of Brews": trophyAccent,
  "Brewing Legend": hexagonAccent,
  "First Recipe": penAccent,
  "Recipe Notebook": booksAccent,
  "Recipe Designer": crownAccent,
  "Recipe Library": archiveAccent,
  "Recipe Sage": lightbulbAccent,
  "First Share": shareAccent,
  "Recipe Friend": peopleAccent,
  "Open Cellar": keyAccent,
  "Shared Inspiration": heartAccent,
  "Open Source Cellar": starAccent,
  "First Conversation": microphoneAccent,
  "Community Contributor": checkmarkAccent,
  "Forum Veteran": medalAccent,
  "Community Pillar": laurelsAccent,
  "Community Champion": shieldAccent,
  "Helpful Regular": plusAccent,
};

const CUSTOM_ACHIEVEMENT_ACCENTS: Record<string, ReactNode> = {
  "First Batch": <><path d="M14 19h20v20H14zM11 19h26m-20 0v-6h12v6" /><path d="M18 25h12m-12 6h12" /><circle cx="18" cy="35" r="1" /><circle cx="30" cy="35" r="1" /></>,
  "Kettle Companion": <><path d="M14 19h20v20H14zM11 19h26m-20 0v-6h12v6" /><path d="M20 25c-3-4-8 0-4 4l8 7 8-7c4-4-1-8-4-4l-4 4-4-4Z" /></>,
  "Batch Fifty": <><circle cx="24" cy="24" r="15" /><path d="M14 14c2-2 4-3 6-4m14 4c-2-2-4-3-6-4" /><text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="900" strokeWidth="0.7">50</text><path fill="none" d="M18 34h12" /></>,
  "Brewery Regular": <><path d="M15 11h18v29H15zM12 11h24m-18 6h12v10H18z" /><path d="M19 33h10m-7 0v7m4-7v7" /></>,
  "Kettle Keeper": <><path d="M12 23h24l-3 15H15l-3-15Zm-2 0h28M17 19c0-5 3-8 7-8s7 3 7 8m-7-8V7" /><path d="M20 28h8m-4-4v8" /></>,
  "Brew Enthusiast": <><path d="M12 30h24m-19-4 3-11 7 7 7-7 3 11" /><path d="m17 37 7-4 7 4m-7-4v7" /><circle cx="15" cy="11" r="1" /><circle cx="24" cy="8" r="1.5" /><circle cx="33" cy="11" r="1" /></>,
  "Cellar Builder": <><path d="M13 18h22v21H13zM10 18h28M17 18v21m14-21v21M13 28h22" /><path d="M16 13h16m-12-5h8" /></>,
  "Seasoned Brewer": <><path d="M24 8c-2 8-9 12-9 21a9 9 0 0 0 18 0c0-9-7-13-9-21Z" /><path d="M20 30c2 2 6 2 8 0m-4-9v-5m-8 15 3-2m13 2-3-2" /></>,
  "Fermentation Fanatic": <><path d="M19 10h10m-8 0v12l-7 13a3 3 0 0 0 3 5h14a3 3 0 0 0 3-5l-7-13V10" /><path d="M17 32h14m-11-5h8" /><circle cx="22" cy="29" r="1" /><circle cx="27" cy="24" r="1" /></>,
  "Grand Brewmaster": <><path d="m12 20 3-10 9 6 9-6 3 10v4H12v-4Z" /><path d="M15 24h18v15H15zM19 30h10m-10 5h10" /><circle cx="17" cy="17" r="1" /><circle cx="24" cy="17" r="1" /><circle cx="31" cy="17" r="1" /></>,
  "Recipe Tinkerer": <><path d="M15 13h18v26H15zM19 19h10m-10 5h6" /><path d="m28 31 7-7 3 3-7 7-4 1 1-4Z" /><circle cx="18" cy="33" r="1" /></>,
  "Recipe Developer": <><path d="M13 27h22l-3 12H16l-3-12Zm-2 0h26" /><path d="M18 23c-2-3 2-4 0-7m7 7c-2-3 2-4 0-7m7 7c-2-3 2-4 0-7" /><path d="m19 32 2 2m6-2 2 2" /></>,
  "Recipe Architect": <><path d="M12 37 30 11l6 4-18 26-6-4Z" /><path d="m25 18 5 4m-9 1 5 4m-9 1 5 4m-9 1 5 4" /><path d="M11 40h26" /></>,
  "Recipe Collector": <><path d="M14 13h20v27H14zM11 13h26" /><path d="M19 20h10m-10 5h10m-10 5h10m-10 5h6" /><path d="m29 9 2 2 4-5" /></>,
  "Recipe Curator": <><path d="M15 12h21v28H15zM12 12h25" /><path d="m19 22 2 2 4-5m-6 12 2 2 4-5m2-7h5m-5 12h5" /></>,
  "Recipe Master": <><path d="M24 8v31m0-19c-7 0-11-4-11-11 7 0 11 4 11 11Zm0-5c0-7 4-11 11-11 0 7-4 11-11 11Z" /><path d="M17 39h14m-12-5 5 5m7-5-5 5" /></>,
  "Recipe Archive": <><path d="M12 14h24v26H12zM9 14h30v-5H9z" /><path d="M18 20h12v6H18zm0 10h12v6H18zM24 20v6m0 4v6" /></>,
  "Generous Brewer": <><path d="M24 39s-13-8-13-18a7 7 0 0 1 13-4 7 7 0 0 1 13 4c0 10-13 18-13 18Z" /><path d="M18 25h4l2-4 3 9 2-5h3" /></>,
  "Open Recipe Shelf": <><path d="M11 15h26v24H11zM9 15h30m-24 8h20m-20 8h20" /><path d="M16 10h6v5m5-5h6v5" /></>,
  "Community Cookbook": <><path d="M12 13c5-2 9-1 12 2 3-3 7-4 12-2v25c-5-2-9-1-12 2-3-3-7-4-12-2V13Z" /><path d="M24 15v25m-8-20h5m7 0h5m-17 6h5m7 0h5" /></>,
  "Recipe Advocate": <><path d="M12 13h25v18H23l-8 6v-6h-3V13Z" /><path d="M18 20h14m-14 5h9m8 7 3 3 5-7" /></>,
  "Recipe Ambassador": <><path d="M12 14h15v25H12zM16 20h7m-7 5h7" /><path d="m33 12 2 5 5 1-4 4 1 5-4-3-5 3 1-5-3-4 5-1 2-5Z" /></>,
  "Shared Cellar": <><path d="M13 14h22v25H13zM10 14h28" /><path d="M17 20h14v7H17zm0 11h14v5H17zM21 20v7m6-7v7" /></>,
  "Friendly Voice": <><circle cx="24" cy="17" r="6" /><path d="M12 39c1-8 5-13 12-13s11 5 12 13" /><path d="M17 18c2 2 4 3 7 3s5-1 7-3" /></>,
  "Conversation Starter": <><path d="M11 12h26v19H23l-8 6v-6h-4V12Z" /><path d="M24 17v10m-5-5h10" /><circle cx="24" cy="22" r="11" /></>,
  "Brewing Buddy": <><circle cx="18" cy="18" r="5" /><circle cx="31" cy="18" r="5" /><path d="M9 38c0-7 3-11 9-11 3 0 5 1 6 3 2-2 4-3 7-3 6 0 9 4 9 11" /><path d="m19 32 5 5 5-5" /></>,
  "Community Regular": <><circle cx="24" cy="15" r="5" /><circle cx="12" cy="20" r="4" /><circle cx="36" cy="20" r="4" /><path d="M14 38c0-7 4-11 10-11s10 4 10 11m-23-2c0-5 2-8 6-9m21 9c0-5-2-8-6-9" /></>,
  "Welcoming Presence": <><path d="M24 39s-13-8-13-18a7 7 0 0 1 13-4 7 7 0 0 1 13 4c0 10-13 18-13 18Z" /><path d="M18 25h12m-6-6v12" /></>,
  "Community Guide": <><path d="m24 8 4 11 12 1-9 8 3 12-10-6-10 6 3-12-9-8 12-1 4-11Z" /><path d="M24 19v11m-4-5h8" /></>,
  "The Great Recipe Exchange": <><path d="M7 13h8l4 4v21H7zM29 13h8l4 4v21h-8z" /><path fill="none" d="M10 21h6m-6 5h6m17-5h6m-6 5h6" /><path d="M19 17h8v-3l5 5-5 5v-3h-8zM29 29h-8v-3l-5 5 5 5v-3h8z" /></>,
};

function ProgressRing({
  ratio,
  unlocked,
  label,
  center,
}: {
  ratio: number;
  unlocked: boolean;
  label: string;
  center?: ReactNode;
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
        {center ?? (unlocked ? "✓" : label)}
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

export function ProfileAchievements({
  stats,
  showProgress = true,
  accentColor,
  categoryPercentiles,
}: {
  stats: ProfileStats;
  showProgress?: boolean;
  accentColor?: string | null;
  categoryPercentiles?: Record<string, number | null> | null;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const accentStyle: CSSProperties = isAccentColor(accentColor)
    ? getAccessibleAccentStyle(accentColor)
    : {};
  const achievements = CATEGORIES.flatMap(({ name: category, stat, tiers }) =>
    tiers.map(([name, goal], tierIndex): Achievement => {
      const progress = Math.max(0, stats[stat]);
      return {
        name,
        goal,
        progress,
        stat,
        category,
        tierIndex,
        unlocked: progress >= goal,
        ratio: Math.min(progress / goal, 1),
      };
    })
  );
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const earnedHighlights = CATEGORIES.flatMap(({ name }) => {
    const unlockedInCategory = achievements.filter(
      (achievement) => achievement.category === name && achievement.unlocked
    );
    const highestUnlocked = unlockedInCategory[unlockedInCategory.length - 1];
    return highestUnlocked ? [highestUnlocked] : [];
  });
  const visibleAchievements = showProgress
    ? achievements
    : achievements.filter((achievement) => achievement.unlocked);
  const active =
    visibleAchievements.find((achievement) => achievement.name === selected) ?? null;

  return (
    <section
      className="mt-10 rounded-xl border border-white/10 bg-white/5 p-5"
      style={accentStyle}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="profile-achievements-list"
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h3 className="text-lg font-semibold text-green-200">Achievements</h3>
          <span className="mt-1 block text-xs text-white/50">
            {unlockedCount} earned
            {showProgress ? ` · ${achievements.length - unlockedCount} to go` : ""}
          </span>
        </div>
        <span aria-hidden className="text-sm text-white/60">
          {open ? "Hide" : "Explore"}
        </span>
      </button>
      {!open && earnedHighlights.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {earnedHighlights.map((achievement) => (
            <li
              key={achievement.name}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-green-300/15 bg-green-300/5 p-3 transition-colors hover:bg-green-300/10"
            >
              <AchievementIcon
                name={achievement.name}
                stat={achievement.stat}
                unlocked={achievement.unlocked}
                className="h-12 w-12"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-white/50">
                  {achievement.category}
                </span>
                <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 text-xs font-semibold leading-snug text-white/90">
                    {achievement.name}
                  </span>
                  {typeof categoryPercentiles?.[achievement.category] === "number" && (
                    <span className="shrink-0 rounded-full border border-green-300/20 bg-green-300/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-green-200">
                      Top {categoryPercentiles[achievement.category]}%
                    </span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div
        id="profile-achievements-list"
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-5 space-y-5">
          {CATEGORIES.map((category) => {
            const categoryAchievements = visibleAchievements.filter(
              (achievement) => achievement.category === category.name
            );
            if (!categoryAchievements.length) return null;
            const categoryEarned = categoryAchievements.filter(
              (achievement) => achievement.unlocked
            ).length;

            return (
              <div key={category.name}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white/85">{category.name}</h4>
                  <span className="text-xs text-white/45">
                    {showProgress
                      ? `${categoryEarned} / ${categoryAchievements.length}`
                      : `${categoryEarned} earned`}
                  </span>
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryAchievements.map((achievement) => (
                    <li key={achievement.name}>
                      <button
                        type="button"
                        onClick={() => setSelected(achievement.name)}
                        tabIndex={open ? 0 : -1}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:bg-white/10 ${
                          achievement.unlocked
                            ? "border-green-300/15 bg-green-300/5"
                            : "border-white/10 bg-black/10 opacity-75"
                        }`}
                      >
                        <AchievementIcon
                          name={achievement.name}
                          stat={achievement.stat}
                          unlocked={achievement.unlocked}
                          className="h-14 w-14"
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-white/90">
                            {achievement.name}
                          </span>
                          {showProgress && !achievement.unlocked && (
                            <span className="mt-1 block text-[11px] text-white/50">
                              {achievement.progress} / {achievement.goal}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {!visibleAchievements.length && (
            <p className="text-sm text-white/55">
              No achievements earned yet. The first one starts with your first batch.
            </p>
          )}
          </div>
        </div>
      </div>
      {active && typeof document !== "undefined" && createPortal(
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
              ratio={active.unlocked ? 1 : active.ratio}
              unlocked={active.unlocked}
              label={active.unlocked ? "✓" : `${Math.round(active.ratio * 100)}%`}
              center={
                <AchievementIcon
                  name={active.name}
                  stat={active.stat}
                  unlocked={active.unlocked}
                  className="h-14 w-14"
                />
              }
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
              <span className="font-semibold text-white/90">
                {active.unlocked ? "Milestone: " : "How to earn: "}
              </span>
              {HOW_TO[active.stat](active.goal)}
            </p>
            {showProgress && (
              <p className="text-xs text-white/50">
                Progress: {Math.min(active.progress, active.goal)} / {active.goal}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-2 rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}