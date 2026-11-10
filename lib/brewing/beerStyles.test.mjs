import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { beerStyleOptions, isBeerStyle } from "./beerStyles.ts";

const sourBeerStyles = [
  "Sour",
  "Fruited Sour",
  "Kettle Sour",
  "Berliner Weisse",
  "Gose",
  "Lambic",
  "Gueuze",
  "Flanders Red Ale",
  "Oud Bruin",
];

test("popular sour beer styles are available and accepted as beer styles", () => {
  for (const style of sourBeerStyles) {
    assert.ok(beerStyleOptions.includes(style), `${style} is selectable`);
    assert.equal(isBeerStyle(style), true, `${style} is accepted`);
  }
});

test("popular sour beer styles have English and Norwegian labels", async () => {
  const [english, norwegian] = await Promise.all(
    ["en", "nb"].map(async (language) =>
      JSON.parse(
        await readFile(new URL(`../i18n/locales/${language}.json`, import.meta.url), "utf8")
      )
    )
  );
  const norwegianLabels = {
    Sour: "Surøl",
    "Fruited Sour": "Fruktig surøl",
    "Kettle Sour": "Kjelesurøl",
    "Berliner Weisse": "Berliner Weisse",
    Gose: "Gose",
    Lambic: "Lambik",
    Gueuze: "Geuze",
    "Flanders Red Ale": "Flamsk rødøl",
    "Oud Bruin": "Oud bruin",
  };

  for (const style of sourBeerStyles) {
    assert.equal(english[style], style, `English label for ${style}`);
    assert.equal(norwegian[style], norwegianLabels[style], `Norwegian label for ${style}`);
  }
});
