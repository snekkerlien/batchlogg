// -----------------------------
// Malt database (kan flyttes til egen fil)
// -----------------------------
export const MALTS_DB = [
  { name: "Pilsnermalt", lovibond: 3 / 1.97 },
  { name: "Munich Malt", lovibond: 15 / 1.97 },
  { name: "Hvetemalt", lovibond: 3 / 1.97 },
  { name: "Maris Otter Pale Ale Malt", lovibond: 5 / 1.97 },
  { name: "Vienna Malt", lovibond: 10 / 1.97 },
  { name: "Chocolate Malt", lovibond: 1250 / 1.97 },
  { name: "Planet Pale Ale Malt", lovibond: 5 / 1.97 },

  { name: "Caramunich I", lovibond: 80 / 1.97 },
  { name: "Caramunich II", lovibond: 120 / 1.97 },
  { name: "Caramunich III", lovibond: 150 / 1.97 },

  { name: "Crystal T50", lovibond: 130 / 1.97 },
  { name: "Crystal Dark", lovibond: 265 / 1.97 },
  { name: "Crystal Light", lovibond: 105 / 1.97 },
  { name: "Crystal Extra Dark", lovibond: 475 / 1.97 },
  { name: "Crystal 240", lovibond: 240 / 1.97 },
  { name: "Heritage Crystal", lovibond: 180 / 1.97 },

  { name: "CaraMalt", lovibond: 36 / 1.97 },
  { name: "CaraHell", lovibond: 25 / 1.97 },
  { name: "CaraAmber", lovibond: 26.85 },
  { name: "CaraGlow", lovibond: 15 / 1.97 },
  { name: "CaraAroma", lovibond: 400 / 1.97 },
  { name: "Carared", lovibond: 50 / 1.97 },
  { name: "Amber Malt", lovibond: 58 / 1.97 },

  { name: "Melanoidin Malt", lovibond: 70 / 1.97 },
  { name: "Aromatic Malt", lovibond: 22 },
  { name: "Imperial Malt", lovibond: 45 / 1.97 },
  { name: "Export Pale Brown", lovibond: 120 / 1.97 },

  { name: "Special B", lovibond: 290 / 1.97 }, // midt i intervallet 260–320

  { name: "Extra Pale Premium Pilsner Malt", lovibond: 2.5 / 1.97 },
  { name: "Barke Pilsnermalt", lovibond: 3 / 1.97 },
  { name: "Eraclea Pilsnermalt", lovibond: 3.5 / 1.97 },
  { name: "Castle Pilsnermalt", lovibond: 3.5 / 1.97 },
  { name: "Floor-Malted Bohemian Pilsner Malt", lovibond: 6 / 1.97 },

  { name: "Munich Malt II", lovibond: 22 / 1.97 },

  { name: "Dark Wheat Malt", lovibond: 18 / 1.97 },
  { name: "Rye Malt", lovibond: 7 / 1.97 }, // midt i intervallet 4–10
  { name: "Spelt Malt", lovibond: 5 / 1.97 }, // midt i intervallet 3–7

  { name: "Oat Malt", lovibond: 4 / 1.97 },
  { name: "Golden Naked Oats", lovibond: 18 / 1.97 }, // midt i intervallet 12–25
  { name: "Naked Oats", lovibond: 4 / 1.97 },

  { name: "Flaked Oats", lovibond: 1 / 1.97 },
  { name: "Flaked Wheat", lovibond: 1 / 1.97 },
  { name: "Flaked Barley", lovibond: 1 / 1.97 },
  { name: "Flaked Corn", lovibond: 1 / 1.97 },
  { name: "Flaked Rice", lovibond: 1 / 1.97 },

  { name: "Torrefied Wheat", lovibond: 1 / 1.97 },
  { name: "Chit Malt", lovibond: 3.5 / 1.97 },

  { name: "Acidulated Malt", lovibond: 4 / 1.97 },

  { name: "Pale Chocolate Malt", lovibond: 600 / 1.97 },
  { name: "Roasted Barley", lovibond: 1600 / 1.97 },
  { name: "Black Malt", lovibond: 1650 / 1.97 },

  { name: "Carafa Special I", lovibond: 350 },
  { name: "Carafa Special II", lovibond: 500 },
  { name: "Carafa Special III", lovibond: 550 },

  { name: "Rice Hulls", lovibond: 0 },
  { name: "English Caramalt", lovibond: 60 / 1.97 },
  { name: "Carapils", lovibond: 4 / 1.97 },
  { name: "DRC", lovibond: 250 / 1.97 },
  { name: "Brown Malt", lovibond: 500 / 1.97 },
  { name: "Abbey Malt", lovibond: 45 / 1.97 },
  { name: "Bøkerøkt Bygg", lovibond: 5 / 1.97 },
  { name: "Medium Peated", lovibond: 4 / 1.97 },
  { name: "Havre", lovibond: 3 / 1.97 },
  { name: "Oat", lovibond: 3 / 1.97 },
  { name: "Rye", lovibond: 7 / 1.97 },
  { name: "Rug", lovibond: 7 / 1.97 },
  { name: "Red X", lovibond: 30 / 1.97 },
];

export const MALT_ALIASES: Record<string, string> = {
  // -----------------------------
  // Pilsner
  // -----------------------------
  "pilsner": "Pilsnermalt",
  "pilsner malt": "Pilsnermalt",
  "pils malt": "Pilsnermalt",
  "pilsnermalt": "Pilsnermalt",
  "pilsner-malt": "Pilsnermalt",
  "pale ale": "Planet Pale Ale Malt",
  "planet pale": "Planet Pale Ale Malt",

  "barke pilsner": "Barke Pilsnermalt",
  "barke pils": "Barke Pilsnermalt",

  "eraclea pilsner": "Eraclea Pilsnermalt",
  "eraclea pils": "Eraclea Pilsnermalt",

  "castle pilsner": "Castle Pilsnermalt",
  "castle pils": "Castle Pilsnermalt",

  "floor malted bohemian pilsner": "Floor-Malted Bohemian Pilsner Malt",
  "floor malted bohemian": "Floor-Malted Bohemian Pilsner Malt",
  "bohemian pilsner": "Floor-Malted Bohemian Pilsner Malt",
  "floor malted": "Floor-Malted Bohemian Pilsner Malt",

  "extra pale pilsner": "Extra Pale Premium Pilsner Malt",
  "extra pale premium pilsner": "Extra Pale Premium Pilsner Malt",

  // -----------------------------
  // Munich
  // -----------------------------
  "munich": "Munich Malt",
  "munich 1": "Munich Malt",
  "munich malt 1": "Munich Malt",
  "munich i": "Munich Malt",
  "munich type 1": "Munich Malt",

  "munich 2": "Munich Malt II",
  "munich ii": "Munich Malt II",
  "munich malt 2": "Munich Malt II",
  "munich type 2": "Munich Malt II",

  // -----------------------------
  // Caramunich
  // -----------------------------
  "caramunich 1": "Caramunich I",
  "caramunich i": "Caramunich I",
  "caramunich type 1": "Caramunich I",

  "caramunich 2": "Caramunich II",
  "caramunich ii": "Caramunich II",
  "caramunich type 2": "Caramunich II",

  "caramunich 3": "Caramunich III",
  "caramunich iii": "Caramunich III",
  "caramunich type 3": "Caramunich III",

  // -----------------------------
  // Crystal malts
  // -----------------------------
  "crystal t50": "Crystal T50",
  "crystal 50": "Crystal T50",
  "t50": "Crystal T50",

  "crystal dark": "Crystal Dark",
  "dark crystal": "Crystal Dark",

  "crystal light": "Crystal Light",
  "light crystal": "Crystal Light",

  "crystal extra dark": "Crystal Extra Dark",
  "extra dark crystal": "Crystal Extra Dark",

  "crystal 240": "Crystal 240",
  "heritage crystal": "Heritage Crystal",

  // -----------------------------
  // Cara malts
  // -----------------------------
  "caramalt": "CaraMalt",
  "cara malt": "CaraMalt",
  "caramel malt": "CaraMalt",

  "carahell": "CaraHell",
  "cara hell": "CaraHell",
  "caramell hell": "CaraHell",

  "caraamber": "CaraAmber",
  "cara amber": "CaraAmber",
  "caramel amber": "CaraAmber",

  "caraglow": "CaraGlow",
  "cara glow": "CaraGlow",
  "caramel glow": "CaraGlow",

  "caraaroma": "CaraAroma",
  "cara aroma": "CaraAroma",
  "caramel aroma": "CaraAroma",

  "carared": "Carared",
  "cara red": "Carared",
  "caramel red": "Carared",

  // -----------------------------
  // Carafa Special
  // -----------------------------
  "carafa 1": "Carafa Special I",
  "carafa i": "Carafa Special I",
  "carafa type 1": "Carafa Special I",

  "carafa 2": "Carafa Special II",
  "carafa ii": "Carafa Special II",
  "carafa type 2": "Carafa Special II",

  "carafa 3": "Carafa Special III",
  "carafa iii": "Carafa Special III",
  "carafa type 3": "Carafa Special III",

  "carafa special 1": "Carafa Special I",
  "carafa special i": "Carafa Special I",

  "carafa special 2": "Carafa Special II",
  "carafa special ii": "Carafa Special II",

  "carafa special 3": "Carafa Special III",
  "carafa special iii": "Carafa Special III",

  // -----------------------------
  // Roasted / Dark malts
  // -----------------------------
  "chocolate": "Chocolate Malt",
  "chocolate malt": "Chocolate Malt",
  "sjokolade": "Chocolate Malt",
  "sjokolade malt": "Chocolate Malt",

  "pale chocolate": "Pale Chocolate Malt",
  "pale chocolate malt": "Pale Chocolate Malt",
  "low colour chocolate": "Pale Chocolate Malt",
  "low color chocolate": "Pale Chocolate Malt",

  "black": "Black Malt",
  "black malt": "Black Malt",

  "roasted barley": "Roasted Barley",
  "roast barley": "Roasted Barley",

  "brown": "Brown Malt",
  "brown malt": "Brown Malt",

  // -----------------------------
  // Base malts
  // -----------------------------
  "maris otter": "Maris Otter Pale Ale Malt",
  "maris otter pale": "Maris Otter Pale Ale Malt",
  "maris otter malt": "Maris Otter Pale Ale Malt",

  
  "planet pale ale": "Planet Pale Ale Malt",

  "vienna": "Vienna Malt",
  "vienna malt": "Vienna Malt",

  "imperial": "Imperial Malt",
  "imperial malt": "Imperial Malt",

  "export pale brown": "Export Pale Brown",

  // -----------------------------
  // Wheat / Rye / Oats
  // -----------------------------
  "wheat": "Hvetemalt",
  "hvetemalt": "Hvetemalt",
  "hvete malt": "Hvetemalt",

  "dark wheat": "Dark Wheat Malt",
  "dark wheat malt": "Dark Wheat Malt",

  "rye malt": "Rye Malt",
  "rye": "Rye Malt",
  "rug": "Rye Malt",

  "spelt": "Spelt Malt",
  "spelt malt": "Spelt Malt",

  "oat malt": "Oat Malt",
  "havre malt": "Oat Malt",
  "havremalt": "Oat Malt",

  "naked oats": "Golden Naked Oats",
  "golden naked oats": "Golden Naked Oats",
  "GNO": "Golden Naked Oats",
  "gno": "Golden Naked Oats",

  // -----------------------------
  // Flaked grains
  // -----------------------------
  "flaked oats": "Flaked Oats",
  "flaked wheat": "Flaked Wheat",
  "flaked barley": "Flaked Barley",
  "flaked corn": "Flaked Corn",
  "flaked rice": "Flaked Rice",

  "torrefied wheat": "Torrefied Wheat",
  "horrefied wheat": "Torrefied Wheat",

  // -----------------------------
  // Specialty malts
  // -----------------------------
  "melanoidin": "Melanoidin Malt",
  "melanoidin malt": "Melanoidin Malt",
  "melanodin malt": "Melanoidin Malt",
  "Melanodin malt": "Melanoidin Malt",
  "Melanodin": "Melanoidin Malt",

  "aromatic": "Aromatic Malt",
  "aroma malt": "Aromatic Malt",

  "special b": "Special B",
  "b": "Special B",
  "B": "Special B",

  "acidulated": "Acidulated Malt",
  "acid malt": "Acidulated Malt",

  "chit": "Chit Malt",
  "chit malt": "Chit Malt",

  "abbey": "Abbey Malt",
  "abbey malt": "Abbey Malt",

  "carapils": "Carapils",
  "cara pils": "Carapils",

  "english caramalt": "English Caramalt",
  "caramalt english": "English Caramalt",

  "drc": "DRC",

  "red x": "Red X",

  // -----------------------------
  // Smoked / Peated
  // -----------------------------
  "bøkerøkt bygg": "Bøkerøkt Bygg",
  "bokerokt bygg": "Bøkerøkt Bygg",
  "bøkerøkt": "Bøkerøkt Bygg",

  "medium peated": "Medium Peated",
  "peated malt": "Medium Peated",

  // -----------------------------
  // Rice hulls
  // -----------------------------
  "rice hulls": "Rice Hulls",
  "ricehusks": "Rice Hulls",
  "rice husks": "Rice Hulls",
  "risskall": "Rice Hulls",
  "ris skall": "Ruce Hulls",
};
