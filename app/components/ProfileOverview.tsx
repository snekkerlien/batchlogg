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
import ratingsCategory from "../../icons_achievements/ach_ratings.svg";
import {
  COMMUNITY_ACHIEVEMENT_TIERS,
  RATING_ACHIEVEMENT_TIERS,
} from "@/lib/community/achievementTiers";

type ProfileStats = {
  totalBatches: number;
  totalRecipes: number;
  publicRecipes: number;
  forumPosts: number;
  totalRatings: number;
};

type Achievement = {
  name: string;
  goal: number;
  progress: number;
  stat: keyof ProfileStats;
  category: string;
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
      ["Brew Day Regular", 2],
      ["Kettle Companion", 3],
      ["Brew Rhythm", 5],
      ["Steady Ferment", 8],
      ["Batch Ten", 10],
      ["Brewery Regular", 15],
      ["Kettle Keeper", 20],
      ["Brew Enthusiast", 25],
      ["Cellar Builder", 35],
      ["Batch Fifty", 50],
      ["Seasoned Brewer", 75],
      ["Century of Brews", 100],
      ["Fermentation Fanatic", 150],
      ["Grand Brewmaster", 200],
      ["Brewing Legend", 250],
      ["Master of the Mash", 300],
      ["Brewery Builder", 400],
      ["Keeper of the Kettle", 450],
      ["Mythic Brewmaster", 500],
    ],
  },
  {
    name: "Recipe craft",
    stat: "totalRecipes",
    tiers: [
      ["First Recipe", 1],
      ["Recipe Tinkerer", 2],
      ["Recipe Notebook", 3],
      ["Recipe Developer", 5],
      ["Recipe Architect", 7],
      ["Recipe Collector", 10],
      ["Recipe Library", 15],
      ["Recipe Designer", 20],
      ["Recipe Curator", 25],
      ["Recipe Master", 30],
      ["Recipe Archive", 35],
      ["Recipe Sage", 40],
      ["Recipe Encyclopedia", 50],
      ["Master Recipe Maker", 60],
      ["Recipe Innovator", 70],
      ["Recipe Authority", 80],
      ["Recipe Visionary", 85],
      ["Recipe Grandmaster", 90],
      ["Recipe Legend", 95],
      ["The Infinite Cookbook", 100],
    ],
  },
  {
    name: "Sharing",
    stat: "publicRecipes",
    tiers: [
      ["First Share", 1],
      ["Generous Brewer", 2],
      ["Recipe Friend", 3],
      ["Open Cellar", 5],
      ["Open Recipe Shelf", 7],
      ["Shared Inspiration", 10],
      ["Community Cookbook", 15],
      ["Recipe Advocate", 20],
      ["Recipe Ambassador", 25],
      ["Shared Cellar", 30],
      ["Open Source Cellar", 35],
      ["The Great Recipe Exchange", 40],
      ["Community Recipe Shelf", 50],
      ["Recipe Beacon", 60],
      ["A World of Recipes", 70],
      ["Inspiration Without Borders", 80],
      ["The Open Cookbook", 85],
      ["Recipe Philanthropist", 90],
      ["Legendary Recipe Exchange", 95],
      ["A Gift to Every Brewer", 100],
    ],
  },
  {
    name: "Community",
    stat: "forumPosts",
    tiers: COMMUNITY_ACHIEVEMENT_TIERS,
  },
  {
    name: "Ratings",
    stat: "totalRatings",
    tiers: RATING_ACHIEVEMENT_TIERS,
  },
];

const HOW_TO: Record<keyof ProfileStats, (goal: number) => string> = {
  totalBatches: (n) => `Brew and log ${n} ${n === 1 ? "batch" : "batches"} in Batchlog.`,
  totalRecipes: (n) => `Create ${n} ${n === 1 ? "recipe" : "recipes"} in your recipe library.`,
  publicRecipes: (n) => `Make ${n} of your ${n === 1 ? "recipe" : "recipes"} public so others can see ${n === 1 ? "it" : "them"}.`,
  forumPosts: (n) => `Write ${n} ${n === 1 ? "post" : "posts"} in the community forum.`,
  totalRatings: (n) => `Rate and review ${n} ${n === 1 ? "brewery product" : "brewery products"}.`,
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
    case "totalRatings":
      subject = <><path d="m24 8 4.9 10 11 1.6-8 7.8 1.9 11-9.8-5.2-9.8 5.2 1.9-11-8-7.8 11-1.6L24 8Z" /><path d="M17 27h14m-12 5h10" /></>;
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
  totalRatings: ratingsCategory,
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
  "Batch Ten": <><path d="M14 14c2-3 4-4 7-5m6 0c3 1 5 2 7 5m-20 0c-3 3-4 6-4 10m26-10c3 3 4 6 4 10M10 24c0 8 6 14 14 14s14-6 14-14" /><text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="900" strokeWidth=".8">10</text></>,
  "Master of the Mash": <><path d="m16 12 10 10m-2-13 7 7-8 8-7-7 8-8ZM22 23 12 37m-2 2 4-6 3 3-5 4Z" /><path d="m30 11 2-4m3 7 4-1" /></>,
  "Brewery Builder": <><path d="M11 38V17l13-8 13 8v21H11Z" /><path d="M11 22h26M11 29h26M18 17v5m12-5v5m-6 7v7m-9-7v7m18-7v7" /></>,
  "Keeper of the Kettle": <><path d="M13 20h22l-3 16H16l-3-16Zm-2 0h26m-5-5 4-4m-22 4-4-4m10 9v8m8-8v8" /><path d="M18 15a6 6 0 0 1 12 0" /></>,
  "Mythic Brewmaster": <><path d="m14 18 3-8 7 5 7-5 3 8v4H14v-4Z" /><path d="M18 22h12v15H18zM21 28h6m-6 4h6" /><path d="m10 12 1-3m26 3-1-3m-12-2V5" /></>,
  "Recipe Encyclopedia": <><path d="M10 13c5-2 10-1 14 2 4-3 9-4 14-2v24c-5-2-10-1-14 2-4-3-9-4-14-2V13Z" /><path d="M24 15v24m-10-19h6m-6 5h6m8-5h6m-6 5h6" /><circle cx="34" cy="31" r="4" /><path d="m37 34 3 3" /></>,
  "Master Recipe Maker": <><path d="M12 15h20v23H12zM16 21h12m-12 5h8" /><path d="m29 30 8-8 3 3-8 8-5 2 2-5Z" /><path d="m15 11 2-3 2 3m-4 0v4" /></>,
  "Recipe Innovator": <><path d="M17 29a9 9 0 1 1 14 0c-2 2-3 4-3 6h-8c0-2-1-4-3-6Z" /><path d="M20 39h8m-7-4h6m-3-27V5m-12 8-3-2m27 2 3-2m-25 8h-4m31 0h-4" /><path d="M24 16v8m-4-4h8" /></>,
  "Recipe Authority": <><circle cx="24" cy="24" r="14" /><circle cx="24" cy="24" r="8" /><path d="m24 24 8-8m-8 8-1 9m1-9-8-3" /><path d="m12 35-2 5 6-2m16-25 3-4" /></>,
  "Recipe Visionary": <><path d="M8 24s6-10 16-10 16 10 16 10-6 10-16 10S8 24 8 24Z" /><circle cx="24" cy="24" r="5" /><path d="m35 8 1 4 4 1-4 2-1 4-2-4-4-2 4-1 2-4Z" /></>,
  "Recipe Grandmaster": <><path d="m10 18 14-9 14 9-14 8-14-8Z" /><path d="M16 22v9c5 5 11 5 16 0v-9m6-4v13" /><circle cx="38" cy="34" r="2" /></>,
  "Recipe Legend": <><path d="M12 12h20l5 5v20H12zM32 12v7h5" /><path d="M17 26h9m-9 5h7" /><path d="m31 25 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1 2-4Z" /></>,
  "The Infinite Cookbook": <><path d="M11 15c5-3 9-2 13 1 4-3 8-4 13-1v22c-5-3-9-2-13 1-4-3-8-4-13-1V15Z" /><path d="M24 16v22m-9-16h5m8 0h5" /><path d="M14 27c2-5 6-5 10 0s8 5 10 0m-20 0c2 5 6 5 10 0s8-5 10 0" /></>,
  "Community Recipe Shelf": <><path d="M10 14h28v25H10zM8 14h32m-26 7h7v7h-7zm11 0h8v7h-8zm12 0h5v7h-5zm-23 12h8v6h-8zm12 0h8v6h-8zm12 0h5v6h-5Z" /></>,
  "Recipe Beacon": <><path d="M17 38h14l-2-19h-10l-2 19Zm-3 0h20m-16-5h12" /><path d="m17 19-5-7m19 7 5-7M24 7v6" /><path d="m11 8 2 2m24-2-2 2" /></>,
  "A World of Recipes": <><circle cx="24" cy="24" r="15" /><path d="M9 24h30M24 9c5 5 7 10 7 15s-2 10-7 15c-5-5-7-10-7-15s2-10 7-15Z" /><path d="m13 15 4 2m18-2-4 2M13 33l4-2m18 2-4-2" /></>,
  "Inspiration Without Borders": <><circle cx="14" cy="24" r="5" /><circle cx="34" cy="14" r="5" /><circle cx="34" cy="34" r="5" /><path d="m18 22 11-6m-11 10 11 6" /><path d="m30 11 4-4 4 4m-8 20 4 4 4-4" /></>,
  "The Open Cookbook": <><path d="M10 15c5-2 10-1 14 2 4-3 9-4 14-2v23c-5-2-10-1-14 2-4-3-9-4-14-2V15Z" /><path d="M24 17v23m-10-19h5m10 0h5" /><path d="M24 8v4m-8-2 2 3m14-3-2 3" /></>,
  "Recipe Philanthropist": <><path d="M11 21h26l-3 16H14l-3-16Zm-2 0h30m-22-4h14" /><path d="M24 32s-6-3-6-7a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7-6 7Z" /><path d="m14 14 3 3m17-3-3 3" /></>,
  "Legendary Recipe Exchange": <><path d="M12 13h9v24h-9zM27 13h9v24h-9z" /><path d="M15 19h3m-3 5h3m12-5h3m-3 5h3" /><path d="M21 19h7l-3-3m3 3-3 3m-1 8h-7l3-3m-3 3 3 3" /><path d="m24 10 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /></>,
  "A Gift to Every Brewer": <><path d="M11 20h26v18H11zM9 16h30v6H9z" /><path d="M24 16v22m0-22c-8 0-10-7-5-7 3 0 5 7 5 7Zm0 0c8 0 10-7 5-7-3 0-5 7-5 7Z" /><path d="M17 28h4m6 0h4" /></>,
  "Community Mentor": <><circle cx="19" cy="18" r="5" /><circle cx="31" cy="20" r="4" /><path d="M9 37c0-7 4-11 10-11 5 0 9 4 9 11m0-8c5-2 10 2 10 8" /><path d="m19 12 1-3 2 3m-3 3 2 2 2-2" /></>,
  "Community Luminary": <><path d="M18 28a9 9 0 1 1 12 0c-2 2-3 4-3 6h-6c0-2-1-4-3-6Z" /><path d="M21 38h6m-5-4h4m-2-27V4m-12 9-3-2m27 2 3-2m-25 8H9m30 0h-4" /><path d="m24 15 1 4 4 1-4 2-1 4-2-4-4-2 4-1 2-4Z" /></>,
  "The Welcoming Table": <><path d="M9 22h30m-27 0 2 15h20l2-15M17 37v3m14-3v3" /><path d="M18 17a6 6 0 0 1 12 0v5H18v-5Zm6-8V6m-9 4-2-2m19 2 2-2" /></>,
  "Forum Steward": <><path d="M24 9 36 14v9c0 8-5 13-12 17-7-4-12-9-12-17v-9l12-5Z" /><path d="m18 25 4 4 9-10m-7-5v7" /></>,
  "Community Legend": <><path d="m11 19 4-9 9 6 9-6 4 9v4H11v-4Z" /><path d="M14 23h20v15H14zM19 29h10m-10 5h10" /><path d="m9 13-3-3m33 3 3-3" /></>,
  "Voice of the Community": <><path d="M10 21h7l17-8v22l-17-8h-7zM17 27l3 11h7l-4-9" /><path d="M38 19c3 3 3 9 0 12m-4-8 3 2-3 2" /></>,
  "Brewing Community Icon": <><circle cx="17" cy="19" r="5" /><circle cx="31" cy="19" r="5" /><path d="M8 38c0-7 3-11 9-11 3 0 5 1 7 3 2-2 4-3 7-3 6 0 9 4 9 11" /><path d="m24 11 2 3 4 .5-3 3 .7 4-3.7-2-3.7 2 .7-4-3-3 4-.5 2-3Z" /></>,
  "The Heart of Batchlogg": <><path d="M24 39S10 31 10 20a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 11-14 19-14 19Z" /><path d="M18 25h4l2-4 3 8 2-4h3m-8-18v3" /></>,
  "First Rating": <><path d="M12 11h24v27H12zM17 18h7m-7 6h5m-5 6h4" /><path d="m31 22 1.7 3.5 3.8.6-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.6L31 22Z" /></>,
  "Thoughtful Taster": <><path d="M18 10h12l-1 9 7 14a3 3 0 0 1-3 5H15a3 3 0 0 1-3-5l7-14-1-9Z" /><path d="M17 29h14m-9-14h4m-2 0v7" /><circle cx="22" cy="33" r="1" /><circle cx="27" cy="35" r="1" /></>,
  "Tasting Notes": <><path d="M13 10h22v29H13zM18 17h12m-12 6h8" /><path d="m19 34 3-7 4 4 7-8m-14 11h14" /></>,
  "Reliable Reviewer": <><path d="M14 12h20v27H14zM19 19h10m-10 5h10m-10 5h5" /><path d="m20 34 3 3 7-8" /><path d="M19 9h10" /></>,
  "Rating Regular": <><circle cx="24" cy="24" r="15" /><path d="M24 14v11l8 5m-8-21v3m11 12h3M10 24h3" /><path d="m17 11 2 3m12-3-2 3" /></>,
  "Taster in Training": <><path d="M12 14h24v23H12zM17 20h14m-14 5h9" /><path d="m27 31 4 4 7-9" /><path d="M18 10h12" /></>,
  "Trusted Taster": <><path d="M24 9 36 14v9c0 8-5 13-12 17-7-4-12-9-12-17v-9l12-5Z" /><path d="m18 25 4 4 8-9m-6-6v5" /></>,
  "Local Guide": <><path d="M24 39s-11-9-11-19a11 11 0 1 1 22 0c0 10-11 19-11 19Z" /><circle cx="24" cy="20" r="4" /><path d="M17 31h14" /></>,
  "Tasting Trail": <><path d="m11 34 8-9 6 4 12-15" /><path d="M30 14h7v7" /><circle cx="12" cy="34" r="2" /><circle cx="19" cy="25" r="2" /><circle cx="25" cy="29" r="2" /><path d="M12 12h10v6H12z" /></>,
  "Product Scout": <><circle cx="21" cy="21" r="10" /><path d="m28 28 9 9M21 16v10m-5-5h10" /><path d="M12 10h8" /></>,
  "Tasting Authority": <><path d="m24 8 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1 4-9Z" /><path d="M20 25h8m-4-4v8" /></>,
  "Valued Recommendations": <><path d="M10 13h28v22H10zM15 19h10m-10 5h8" /><path d="m30 20 1.5 3 3.5.5-2.5 2.5.6 3.5-3.1-1.7-3.1 1.7.6-3.5-2.5-2.5 3.5-.5L30 20Z" /></>,
  "Community Critic": <><path d="M11 13h26v20H22l-8 6v-6h-3V13Z" /><path d="m18 19 1.5 3 3.5.5-2.5 2.5.6 3.5-3.1-1.7-3.1 1.7.6-3.5-2.5-2.5 3.5-.5L18 19Zm12 3h4m-4 5h4" /></>,
  "Fifty Impressions": <><path d="M12 14h24v22H12zM9 14h30m-24 8h18m-18 6h12" /><text x="24" y="33" textAnchor="middle" fontSize="9" fontWeight="900" strokeWidth=".6">50</text></>,
  "Expert Palate": <><path d="M12 11h24v27H12zM17 18h14m-14 5h10" /><path d="m24 28 2 4 4 .5-3 3 .7 4.5-3.7-2-3.7 2 .7-4.5-3-3 4-.5 2-4Z" /></>,
  "Seasoned Reviewer": <><path d="M17 10h14l-1 9 7 14a3 3 0 0 1-3 5H14a3 3 0 0 1-3-5l7-14-1-9Z" /><path d="M15 30h18m-12-7h6" /><path d="m24 14 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2-1.5-1.5 2-.3 1-2Z" /></>,
  "Master Taster": <><path d="m24 9 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1 4-9Z" /><path d="M24 19v13m-5-7h10" /><circle cx="24" cy="26" r="2" /></>,
  "The People's Palate": <><circle cx="18" cy="17" r="5" /><circle cx="30" cy="17" r="5" /><path d="M8 37c0-7 3-11 10-11 3 0 5 1 6 3 2-2 4-3 6-3 7 0 10 4 10 11" /><path d="m24 10 1 3 3 .5-2.5 2.5.5 3.5-2.5-1.5-2.5 1.5.5-3.5-2.5-2.5 3-.5 1-3Z" /></>,
  "Tasting Legend": <><path d="m11 18 4-8 9 6 9-6 4 8v4H11v-4Z" /><path d="M14 22h20v16H14zM19 28h10m-10 5h10" /><path d="m24 8 1 3" /></>,
  "The Ultimate Reviewer": <><path d="M12 12h24v26H12zM17 18h10m-10 5h8" /><path d="m30 24 2 4 5 .7-3.5 3.4.8 5-4.3-2.3-4.3 2.3.8-5-3.5-3.4 5-.7 2-4Z" /><path d="M17 32h5" /></>,
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
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Batches brewed", stats.totalBatches],
          ["Recipes created", stats.totalRecipes],
          ["Public recipes", stats.publicRecipes],
          ["Forum posts", stats.forumPosts],
          ["Ratings given", stats.totalRatings],
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
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].name);
  const accentStyle: CSSProperties = isAccentColor(accentColor)
    ? getAccessibleAccentStyle(accentColor)
    : {};
  const achievements = CATEGORIES.flatMap(({ name: category, stat, tiers }) =>
    tiers.map(([name, goal]): Achievement => {
      const progress = Math.max(0, stats[stat]);
      return {
        name,
        goal,
        progress,
        stat,
        category,
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
  const visibleCategories = CATEGORIES.map((category) => ({
    ...category,
    achievements: visibleAchievements.filter(
      (achievement) => achievement.category === category.name
    ),
    earned: achievements.filter(
      (achievement) => achievement.category === category.name && achievement.unlocked
    ).length,
  })).filter((category) => showProgress || category.earned > 0);
  const currentCategory =
    visibleCategories.find((category) => category.name === activeCategory) ??
    visibleCategories[0];
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
          <div className="mt-5 space-y-4">
            {!!visibleCategories.length && (
              <div
                role="group"
                aria-label="Achievement categories"
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
              >
                {visibleCategories.map((category) => {
                  const isCurrent = currentCategory?.name === category.name;
                  const total = category.tiers.length;
                  const ratio = total ? category.earned / total : 0;
                  return (
                    <button
                      key={category.name}
                      type="button"
                      aria-pressed={isCurrent}
                      aria-controls="achievement-category-list"
                      tabIndex={open ? 0 : -1}
                      onClick={() => setActiveCategory(category.name)}
                      className={`rounded-lg border p-3 text-left transition ${
                        isCurrent
                          ? "border-green-300/40 bg-green-300/10"
                          : "border-white/10 bg-black/10 hover:bg-white/5"
                      }`}
                    >
                      <span className="block truncate text-xs font-semibold text-white/90">
                        {category.name}
                      </span>
                      <span className="mt-1 block text-[11px] text-white/50">
                        {showProgress
                          ? `${category.earned} / ${total} earned`
                          : `${category.earned} earned`}
                      </span>
                      <span
                        className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10"
                        role="progressbar"
                        aria-label={`${category.name} achievements`}
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-valuenow={category.earned}
                      >
                        <span
                          className="block h-full rounded-full bg-green-300"
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {currentCategory && (
              <div id="achievement-category-list">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white/85">
                    {currentCategory.name}
                  </h4>
                  <span className="text-xs text-white/45">
                    {showProgress
                      ? `${currentCategory.earned} / ${currentCategory.tiers.length} earned`
                      : `${currentCategory.earned} earned`}
                  </span>
                </div>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {currentCategory.achievements.map((achievement) => (
                    <li key={achievement.name}>
                      <button
                        type="button"
                        onClick={() => setSelected(achievement.name)}
                        tabIndex={open ? 0 : -1}
                        title={`${achievement.name} · ${achievement.progress} / ${achievement.goal}`}
                        className={`flex h-full w-full flex-col items-center justify-start gap-2 rounded-lg border p-2 text-center transition hover:bg-white/10 sm:p-3 ${
                          achievement.unlocked
                            ? "border-green-300/15 bg-green-300/5"
                            : "border-white/10 bg-black/10 opacity-75"
                        }`}
                      >
                        <AchievementIcon
                          name={achievement.name}
                          stat={achievement.stat}
                          unlocked={achievement.unlocked}
                          className="h-11 w-11 sm:h-12 sm:w-12"
                        />
                        <span className="min-w-0">
                          <span className="line-clamp-2 block text-[10px] font-semibold leading-tight text-white/90 sm:text-xs">
                            {achievement.name}
                          </span>
                          {showProgress && !achievement.unlocked && (
                            <span className="mt-1 block text-[10px] text-white/50">
                              {achievement.progress} / {achievement.goal}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {!visibleAchievements.length && (
            <p className="text-sm text-white/55">
              No achievements earned yet. Start brewing, sharing recipes, posting, or rating products.
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