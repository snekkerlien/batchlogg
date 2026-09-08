// -----------------------------
// Malt database (kan flyttes til egen fil)
// -----------------------------
export const MALTS_DB = [
  { name: "Pilsnermalt", lovibond: 3 / 1.97 },
  { name: "Munich Malt", lovibond: 15 / 1.97 },
  { name: "Hvetemalt", lovibond: 3 / 1.97 },
  { name: "Maris Otter Pale Ale Malt", lovibond: 5 / 1.97 },
  { name: "Vienna Malt", lovibond: 10 / 1.97 },
  { name: "Chocolate Malt", lovibond: 1150 / 1.97 },
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

  { name: "CaraMalt", lovibond: 30 / 1.97 },
  { name: "CaraHell", lovibond: 25 / 1.97 },
  { name: "CaraAmber", lovibond: 70 / 1.97 },
  { name: "CaraGlow", lovibond: 15 / 1.97 },
  { name: "CaraAroma", lovibond: 400 / 1.97 },
  { name: "Carared", lovibond: 50 / 1.97 },

  { name: "Melanoidin Malt", lovibond: 70 / 1.97 },
  { name: "Aromatic Malt", lovibond: 60 / 1.97 },
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

  { name: "Acidulated Malt", lovibond: 7 / 1.97 },

  { name: "Pale Chocolate Malt", lovibond: 600 / 1.97 },
  { name: "Roasted Barley", lovibond: 1600 / 1.97 },
  { name: "Black Malt", lovibond: 1650 / 1.97 },
  { name: "Carafa Special III", lovibond: 1500 / 1.97 },

  { name: "Rice Hulls", lovibond: 0 },
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
  { name: "Hersbrucker", alpha: 0.028 },
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