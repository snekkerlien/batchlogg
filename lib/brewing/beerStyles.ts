const LEGACY_BEER_STYLE_NAMES = `
American-Style Wheat Beer
American Fruit Beer
Fruit Wheat Beer
Field Beer
Pumpkin or Pumpkin Spice Beer
Chili Beer
Herb and Spice Beer
Chocolate Beer
Coffee Beer
Coffee Stout or Porter
Dessert or Pastry Beer
Wood- and Barrel-Aged Dessert Beer
Rye Beer
German-Style Rye Ale
Honey Beer
Classic Non-Alcohol Ale or Lager
Hoppy Non-Alcohol Beer
Specialty Non-Alcohol Beer
Session Beer
Belgian-Style Table Beer
Belgian-Style Session Ale
German-Style Leichtes Weizen
English-Style Pale Mild Ale
English-Style Dark Mild Ale
Session India Pale Ale
Strong Porter
American-Style Imperial Porter
Baltic-Style Porter
German-Style Strong Beer
German-Style Doppelbock
German-Style Eisbock
South German-Style Weizenbock
Other Strong Beer
American-Style Malt Liquor
Specialty Beer
Multi-Adjunct Beer
Hybrid/Crossover Beer
Specialty India Pale Ale
American-Style Black Ale
Experimental Beer
Ginjo Beer or Sake-Yeast Beer
Historical Beer
Kentucky Common Beer
Grodziskie
Adambier
Dutch-Style Kuyt Beer
Finnish-Style Sahti
Swedish-Style Gotlandsdricke
Breslau-Style Schoeps
Classic Gluten-Free Ale or Lager
Hoppy Gluten-Free Beer
Specialty Gluten-Free Beer
American-Style Sour Ale
American-Style Fruited Sour Ale
Brett Beer
Mixed-Culture Brett Beer
Wood- and Barrel-Aged Beer
Wood- and Barrel-Aged Strong Beer
Wood- and Barrel-Aged Strong Stout
Wood- and Barrel-Aged Sour Beer
Fruited Wood- and Barrel-Aged Sour Beer
Kellerbier or Zwickelbier
Unfiltered European-Style Ale
Unfiltered European-Style Lager
Smoke Beer
Smoke Porter
Bamberg-Style Weiss Rauchbier
Bamberg-Style Helles Rauchbier
Bamberg-Style Maerzen Rauchbier
Bamberg-Style Bock Rauchbier
Other Smoke Beer
American-Style Light Lager
Contemporary American-Style Light Lager
International Light Lager
German-Style Leichtbier
Mexican-Style Light Lager
Mexican-Style Pale Lager
American-Style Lager
Contemporary American-Style Lager
Rice Lager
International-Style Pilsener
American Pilsener
American-Style Pilsener
Contemporary American-Style Pilsener
Hoppy Lager
American-Style India Pale Lager
Other Hoppy Lager
West Coast-Style Pilsener
American Amber Lager
American-Style Amber Lager
California Common Beer
American-Style Maerzen/Oktoberfest
German-Style Pilsener
Czech-Style Pale Lager
Italian-Style Pilsener
Munich-Style Helles
Dortmunder or German-Style Festbier
Dortmunder/European-Style Export
German-Style Festbier
Vienna-Style Lager
German-Style Maerzen
International Amber Lager
Franconian-Style Rotbier
Czech-Style Amber Lager
Mexican-Style Amber Lager
Munich-Style Dunkel
German-Style Schwarzbier
International Dark Lager
American-Style Dark Lager
European-Style Dark Lager
Czech-Style Dark Lager
Mexican-Style Dark Lager
Bock
Traditional German-Style Bock
German-Style Heller Bock/Maibock
German-Style Koelsch
American Cream Ale
Berliner-Style Weisse
Specialty Berliner-Style Weisse
Gose
Leipzig-Style Gose
Contemporary Gose
European-Style Amber Ale
German-Style Altbier
French-Style Biere de Garde
Belgian-Style Speciale Belge
South German-Style Wheat Beer
South German-Style Hefeweizen
South German-Style Kristal Weizen
South German-Style Bernsteinfarbenes Weizen
South German-Style Dunkel Weizen
Golden or Blonde Ale
English Bitter
English-Style Pale Ale
Ordinary Bitter
Special Bitter or Best Bitter
English-Style Summer Ale
Classic English-Style Pale Ale
English-Style ESB or IPA
English-Style Extra Special Bitter
English-Style India Pale Ale
Scottish-Style Ale
Scottish-Style Light Ale
Scottish-Style Heavy Ale
Scottish-Style Export Ale
Irish-Style Red Ale
English-Style Brown Ale
Belgian-Style Witbier
Saison
Classic Saison
Specialty Saison
Belgian-Style Abbey Ale
Belgian-Style Blonde Ale
Belgian-Style Dubbel
Other Belgian-Style Abbey Ale
Belgian-Style Tripel
Belgian-Style Strong Specialty Ale
Belgian-Style Strong Blonde Ale
Belgian-Style Strong Dark Ale
Belgian-Style Quadrupel
Other Belgian-Style Strong Specialty Ale
Belgian-Style or Spontaneous Sour Ale
Belgian-Style Lambic
Belgian-Style Gueuze
Belgian-Style Flanders Oud Bruin or Oud Red Ale
Contemporary Belgian-Style Spontaneous Fermented Ale
Wild Beer
Other Belgian-Style Sour Ale
Belgian-Style Fruit Beer
Belgian-Style Fruit Lambic
American-Style Brown Ale
Porter or Stout
Brown Porter
Classic Irish-Style Dry Stout
Robust Porter
Sweet Stout or Cream Stout
Oatmeal Stout
American or Export Stout
American-Style Stout
Export Stout
Imperial Stout
British-Style Imperial Stout
American-Style Imperial Stout
Strong British Ale or Aged Beer
Unpeated Scotch Ale
Peated Scotch Ale
Old Ale
Strong Ale
Aged Beer
Barley Wine or Wheat Wine
British-Style Barley Wine Ale
American-Style Barley Wine Ale
American-Style Wheat Wine Ale
International-Style Pale Ale
Classic Australian-Style Pale Ale
Australian-Style Pale Ale
New Zealand-Style Pale Ale
New Zealand India Pale Ale
American Pale Ale
American-Style Extra Special Bitter
Juicy or Hazy Pale Ale
American-Style Strong Pale Ale
Juicy or Hazy Strong Pale Ale
American Amber/Red Ale
Strong Red Ale
Double Hoppy Red Ale
Imperial Red Ale
Imperial India Pale Ale
Juicy or Hazy Imperial India Pale Ale
American-Style India Pale Ale
Juicy or Hazy India Pale Ale
West Coast-Style India Pale Ale
Fresh Hop Beer
Craft Malt Beer
`;

const WIKIPEDIA_BEER_STYLE_NAMES = `
Altbier
Amber Ale
Barleywine
Belgian Strong Ale
Berliner Weisse
Bière de Garde
Blonde Ale
Bock
Brown Ale
California Common (Steam Beer)
Cream Ale
Dortmunder Export
Doppelbock
Dunkel
Dunkelweizen
Eisbock
English Bitter
Flanders Red Ale
Golden Ale
Gose
Gueuze
Hefeweizen
Helles
India Pale Ale (IPA)
Kölsch
Lambic
Light Ale
Maibock
Malt Liquor
Märzen (Oktoberfest)
Mild Ale
Old Ale
Oud Bruin
Pale Ale
Pilsner
Porter
Red Ale
Roggenbier (Rye Beer)
Saison
Schwarzbier
Scotch Ale (Wee Heavy)
Smoked Beer
Stout
Vienna Lager
Weissbier
Weizenbock
Wheat Beer
Wild Beer
Witbier
Wood-Aged Beer
Ordinary Bitter
Best Bitter
Strong Bitter (ESB)
American Pale Ale
American IPA
English IPA
Double IPA
New England IPA
Imperial Stout
Oatmeal Stout
Dry Stout
Sweet Stout
Brown Porter
Baltic Porter
Fruit Beer
Herb and Spiced Beer
Honey Beer
Rye Beer
Vegetable Beer
`;

export const beerStyleOptions = [...new Set(
  WIKIPEDIA_BEER_STYLE_NAMES.split("\n").map((style) => style.trim()).filter(Boolean)
)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

const legacyBeerStyleOptions = new Set(
  LEGACY_BEER_STYLE_NAMES.split("\n").map((style) => style.trim()).filter(Boolean)
);

export function isBeerStyle(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (beerStyleOptions.includes(value) || legacyBeerStyleOptions.has(value))
  );
}
