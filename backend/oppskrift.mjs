import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, ingredients, style, volume } = req.body;

    if (!name || !ingredients || !style || !volume) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const oppskrift = `
Oppskrift: ${name}
Stil: ${style}
Batchvolum: ${volume} liter

Ingredienser:
${ingredients}

Fremgangsmåte:
1. Varm opp vann til ca. 65°C og tilsett ingrediensene.
2. Hold temperaturen stabil i 60 minutter.
3. Kok i 60 minutter og tilsett eventuelle humletilsetninger.
4. Kjøl ned til gjæringstemperatur.
5. Pitch gjær og gjær ved passende temperatur.
6. La stå til ferdig gjæring og tapp på flasker eller fat.
`;

    res.json({ oppskrift });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

export default router;
