"use client";

import Link from "next/link";
import PageGuide, { type PageGuideSection } from "@/app/components/PageGuide";
import { useTranslation } from "@/lib/i18n/useTranslation";

export type BatchEntryType =
  | "Beer"
  | "Braggot"
  | "Cider"
  | "Wine"
  | "Mead"
  | "Seltzer"
  | "Other";

export default function BatchEntryGuide({
  vesselId,
  batchType,
  beerSubtype = "",
  recipeName,
}: {
  vesselId: string;
  batchType: BatchEntryType;
  beerSubtype?: string;
  recipeName?: string | null;
}) {
  const { t } = useTranslation();
  const basicSections: PageGuideSection[] = [
    {
      title: t("Batch volume"),
      description: t("Enter the total volume you are putting into this vessel, using the displayed unit."),
    },
    {
      title: t("Start date"),
      description: t("Use the date you brewed or started fermenting. Change it if that was earlier than today."),
    },
    {
      title: t("Original gravity (OG)"),
      description: t("Enter a gravity reading taken before fermentation begins. Use your recipe or kit target if you have one."),
    },
  ];

  const typeSections: Record<BatchEntryType, PageGuideSection[]> = {
    Beer: beerSubtype === "all_grain"
      ? [
          {
            title: t("Beer style and name"),
            description: t("Choose a beer style and give the batch a name that will help you recognize it later."),
          },
          {
            title: t("All-grain volumes"),
            description: t("Enter the pre-boil volume and final batch volume. The final volume is what goes into the fermenter."),
          },
          {
            title: t("Malt and hops"),
            description: t("Add each malt with its amount and EBC, then add hop amounts, boil or whirlpool timing, and any required temperatures."),
          },
          {
            title: t("Yeast and process"),
            description: t("Choose the yeast and record the boil, fermentation plan, and any other notes you want to keep with the batch."),
          },
        ]
      : beerSubtype
        ? [
            {
              title: t("Kit details"),
              description: t("Enter the beer style, kit name, final volume, original gravity, and yeast from the kit instructions."),
            },
            {
              title: t("Kit link"),
              description: t("Add the kit product link if you want to find its instructions or details later."),
            },
            ...(beerSubtype === "fresh_wort_kit"
              ? [{
                  title: t("Fresh wort kit values"),
                  description: t("Enter the IBU and EBC values shown on the fresh wort kit packaging."),
                }]
              : []),
            {
              title: t("Fermentation notes"),
              description: t("Record the fermentation plan, additives, and anything else you want to remember."),
            },
          ]
        : [
            {
              title: t("Choose a brewing method"),
              description: t("Select all-grain, fresh wort kit, or malt extract kit to show the matching fields."),
            },
            {
              title: t("Beer style and recipe"),
              description: t("Choose a beer style. If you have a recipe or kit, use its name, volume, gravity, and yeast details."),
            },
          ],
    Braggot: [
      {
        title: t("Honey and malt"),
        description: t("Record the honey and malt additions, including their amounts and malt color values."),
      },
      {
        title: t("Hops and yeast"),
        description: t("Add hop timing and amounts, then choose the yeast used for the braggot."),
      },
      {
        title: t("Process notes"),
        description: t("Use the process and notes fields for honey timing, fermentation temperature, and other details."),
      },
    ],
    Cider: [
      {
        title: t("Juice and sugar"),
        description: t("Choose the juice type and record any sugar added, including the amount."),
      },
      {
        title: t("Yeast and fermentation"),
        description: t("Choose the yeast and use the process field for fermentation, nutrients, and temperature notes."),
      },
    ],
    Wine: [
      {
        title: t("Grape or juice"),
        description: t("Choose the grape or juice type and record its amount if you track it in inventory."),
      },
      {
        title: t("Sugar and fermentation"),
        description: t("Record any sugar addition, choose the yeast, and note crushing, maceration, and fermentation details."),
      },
    ],
    Mead: [
      {
        title: t("Honey and base liquid"),
        description: t("Choose the honey and base liquid, and enter their amounts when available."),
      },
      {
        title: t("Fruit additions"),
        description: t("Add fruit with its amount and unit. Leave this section empty if the mead has no fruit."),
      },
      {
        title: t("Yeast and fermentation"),
        description: t("Choose the yeast and record nutrient additions, degassing, temperature, and fermentation notes."),
      },
    ],
    Seltzer: [
      {
        title: t("Sugar and gravity"),
        description: t("Record the fermentable sugar and enter the original gravity before fermentation."),
      },
      {
        title: t("Yeast and fermentation"),
        description: t("Choose the yeast and note nutrients, fermentation temperature, and flavor additions."),
      },
    ],
    Other: [
      {
        title: t("Style and ingredients"),
        description: t("Describe the batch type and add the ingredients you want to track."),
      },
      {
        title: t("Process and notes"),
        description: t("Use the process field for the steps and keep any extra observations in notes."),
      },
    ],
  };

  return (
    <PageGuide
      buttonLabel={t("Batch entry guide")}
      eyebrow={t("Help with this batch form")}
      title={t("A guide to entering your batch")}
      description={t("Use these tips to fill in the fields for this batch type. Details from a selected recipe are prefilled and can still be edited.")}
      sectionHeading={t("Tips for this batch")}
      illustration="history"
      footer={
        <span>
          {recipeName ? (
            <>
              {t("Starting from ")}<strong className="text-white/65">{recipeName}</strong>
              {t("? Its saved recipe details are prefilled and can still be edited.")}
              {" "}
            </>
          ) : (
            <>{t("Have a saved recipe?")} </>
          )}
          <Link
            href={`/my-recipes?vessel=${encodeURIComponent(vesselId)}`}
            className="font-semibold text-green-200 underline underline-offset-2"
          >
            {t("Start from a saved recipe")}
          </Link>
          {" "}{t("to prefill its details for this vessel.")}
        </span>
      }
      sections={[...basicSections, ...typeSections[batchType]]}
    />
  );
}
