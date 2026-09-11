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

export const HOPS_DB = [
  { name: "Citra", alpha: 0.14 },
  { name: "Cascade", alpha: 0.057 },
  { name: "Amarillo", alpha: 0.089 },
  { name: "Mosaic", alpha: 0.121 },
  { name: "Chinook", alpha: 0.099 },
  { name: "Columbus", alpha: 0.15 }, // CTZ – oppgis ofte uten tall, men typisk 14–16%
  { name: "Willamette", alpha: 0.05 }, // typisk 4–6%
  { name: "Centennial", alpha: 0.092 },
  { name: "Simcoe", alpha: 0.123 },
  { name: "Idaho 7", alpha: 0.143 },
  { name: "Crystal", alpha: 0.037 },
  { name: "Azacca", alpha: 0.115 },
  { name: "Nugget", alpha: 0.152 },
  { name: "Ekuanot", alpha: 0.142 },
  { name: "El Dorado", alpha: 0.126 },
  { name: "Ahtanum", alpha: 0.037 },
  { name: "Warrior", alpha: 0.154 },
  { name: "Sabro", alpha: 0.152 },
  { name: "Pekko", alpha: 0.116 },
  { name: "Mount Hood", alpha: 0.055 },
  { name: "East Kent Goldings", alpha: 0.067 },
  { name: "Fuggle", alpha: 0.04 },
  { name: "Target", alpha: 0.113 },
  { name: "Challenger", alpha: 0.0625 },
  { name: "Saaz", alpha: 0.033 },
  { name: "Bobek", alpha: 0.044 },
  { name: "Sladek", alpha: 0.052 },
  { name: "Hallertau Mittelfrüh", alpha: 0.051 },
  { name: "Magnum", alpha: 0.14 },
  { name: "Perle", alpha: 0.118 },
  { name: "Tettnang", alpha: 0.038 },
  { name: "Hersbrücker", alpha: 0.028 },
  { name: "Hallertau Tradition", alpha: 0.064 },
  { name: "Hersbrucker Spät", alpha: 0.032 },
  { name: "Spalter Select", alpha: 0.04 },
  { name: "Mandarina Bavaria", alpha: 0.095 },
  { name: "Saphir", alpha: 0.04 },
  { name: "Herkules", alpha: 0.143 },
  { name: "Northern Brewer", alpha: 0.082 },
  { name: "Tango", alpha: 0.051 },
  { name: "Hüll Melon", alpha: 0.063 },
  { name: "Hallertau Blanc", alpha: 0.089 },
  { name: "Galaxy", alpha: 0.178 },
  { name: "Superdelic", alpha: 0.106 },
  { name: "Nectaron", alpha: 0.126 },
  { name: "Nelson Sauvin", alpha: 0.163 },
  { name: "Vic Secret", alpha: 0.173 },
  { name: "Motueka", alpha: 0.083 },
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

  "carahell": "CaraHell",
  "cara hell": "CaraHell",

  "caraamber": "CaraAmber",
  "cara amber": "CaraAmber",

  "caraglow": "CaraGlow",
  "cara glow": "CaraGlow",

  "caraaroma": "CaraAroma",
  "cara aroma": "CaraAroma",

  "carared": "Carared",
  "cara red": "Carared",

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

  "planet pale": "Planet Pale Ale Malt",
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

  "aromatic": "Aromatic Malt",
  "aroma malt": "Aromatic Malt",

  "special b": "Special B",

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

export const HOPS_ALIASES: Record<string, string> = {
  // Citra
  "citra": "Citra",
  "citra hop": "Citra",

  // Cascade
  "cascade": "Cascade",
  "cascade hop": "Cascade",

  // Amarillo
  "amarillo": "Amarillo",
  "amarillo hop": "Amarillo",

  // Mosaic
  "mosaic": "Mosaic",
  "mosaic hop": "Mosaic",

  // Chinook
  "chinook": "Chinook",
  "chinook hop": "Chinook",

  // Columbus / CTZ
  "columbus": "Columbus",
  "ctz": "Columbus",
  "tomahawk": "Columbus",
  "zeus": "Columbus",
  "columbus/tomahawk/zeus": "Columbus",

  // Willamette
  "willamette": "Willamette",

  // Centennial
  "centennial": "Centennial",

  // Simcoe
  "simcoe": "Simcoe",

  // Idaho 7
  "idaho 7": "Idaho 7",
  "idaho7": "Idaho 7",
  "idaho-7": "Idaho 7",

  // Crystal
  "crystal": "Crystal",

  // Azacca
  "azacca": "Azacca",

  // Nugget
  "nugget": "Nugget",

  // Ekuanot
  "ekuanot": "Ekuanot",
  "equanot": "Ekuanot",
  "equinox": "Ekuanot", // gammelt navn

  // El Dorado
  "el dorado": "El Dorado",
  "eldorado": "El Dorado",

  // Ahtanum
  "ahtanum": "Ahtanum",

  // Warrior
  "warrior": "Warrior",

  // Sabro
  "sabro": "Sabro",

  // Pekko
  "pekko": "Pekko",

  // Mount Hood
  "mount hood": "Mount Hood",
  "mt hood": "Mount Hood",

  // East Kent Goldings
  "east kent goldings": "East Kent Goldings",
  "ekg": "East Kent Goldings",
  "kent goldings": "East Kent Goldings",

  // Fuggle
  "fuggle": "Fuggle",

  // Target
  "target": "Target",

  // Challenger
  "challenger": "Challenger",

  // Saaz
  "saaz": "Saaz",

  // Bobek
  "bobek": "Bobek",

  // Sladek
  "sladek": "Sladek",

  // Hallertau Mittelfrüh
  "hallertau mittelfrüh": "Hallertau Mittelfrüh",
  "hallertau mittelfruh": "Hallertau Mittelfrüh",
  "mittelfrüh": "Hallertau Mittelfrüh",
  "mittelfruh": "Hallertau Mittelfrüh",

  // Magnum
  "magnum": "Magnum",

  // Perle
  "perle": "Perle",

  // Tettnang
  "tettnang": "Tettnang",
  "tett": "Tettnang",

  // Hersbrucker
  "hersbrucker": "Hersbrücker",

  // Hallertau Tradition
  "hallertau tradition": "Hallertau Tradition",
  "tradition": "Hallertau Tradition",

  // Hersbrucker Spät
  "hersbrucker spät": "Hersbrucker Spät",
  "hersbrucker spat": "Hersbrucker Spät",
  "spät": "Hersbrucker Spät",
  "spat": "Hersbrucker Spät",

  // Spalter Select
  "spalter select": "Spalter Select",
  "spalter": "Spalter Select",

  // Mandarina Bavaria
  "mandarina bavaria": "Mandarina Bavaria",
  "mandarina": "Mandarina Bavaria",

  // Saphir
  "saphir": "Saphir",

  // Herkules
  "herkules": "Herkules",
  "hercules": "Herkules",

  // Northern Brewer
  "northern brewer": "Northern Brewer",
  "nb": "Northern Brewer",

  // Tango
  "tango": "Tango",

  // Hüll Melon
  "hüll melon": "Hüll Melon",
  "hull melon": "Hüll Melon",
  "hul melon": "Hüll Melon",
  "melon": "Hüll Melon",

  // Hallertau Blanc
  "hallertau blanc": "Hallertau Blanc",
  "blanc": "Hallertau Blanc",

  // Galaxy
  "galaxy": "Galaxy",

  // Superdelic
  "superdelic": "Superdelic",

  // Nectaron
  "nectaron": "Nectaron",

  // Nelson Sauvin
  "nelson sauvin": "Nelson Sauvin",
  "nelson": "Nelson Sauvin",
  "sauvin": "Nelson Sauvin",

  // Vic Secret
  "vic secret": "Vic Secret",
  "vicsecret": "Vic Secret",

  // Motueka
  "motueka": "Motueka",
};
