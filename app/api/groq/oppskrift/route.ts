import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    // Build a single prompt string (Groq does NOT accept OpenAI-style messages)
    const prompt = `
You are BrewCompanion, an expert in mead, beer brewing, cider, wine, and fermentation.
Create a complete recipe based on the user's input.

IMPORTANT:
- The recipe must ALWAYS be scaled to exactly ${body.volume} liters of finished must.
- Do NOT use milk, cream, dairy, or any fat-containing ingredients in fermentation.
- Never add anything containing fat or dairy during the brewing process.
- If the style is "creamy", the creaminess must ONLY come from serving or post-fermentation (foam, topping, emulsions), never inside the fermenter, unless lactose is used.
- Do NOT add more water than necessary to reach ${body.volume} liters total volume.
- Ingredients must be realistic for the chosen style, and quantities must be correct for the batch size.
- Avoid unnecessary or unsafe ingredients.
- Avoid unnecessary details that distract the user.
- Always specify common yeast types and always use grams, deciliters, or liters. Do NOT use tablespoons or similar units.

ALWAYS write in this format:

Ingredients:
- bullet list

Method:
1. step
2. step

Notes:
- bullet list

Write in English.
Do NOT add extra sections.

Name: ${body.name}
Ingredients: ${body.ingredients}
Style: ${body.stil ?? "standard"}
Volume: ${body.volume} liters
`;

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: "You are BrewCompanion, an expert brewing assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 800,
    });

    const recipeText = response.choices[0]?.message?.content ?? "";

    if (!recipeText.trim()) {
      return NextResponse.json(
        { error: "AI returned an empty recipe" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      oppskrift: recipeText,
    });

  } catch (err: any) {
    console.error("GROQ ERROR:", err);
    return NextResponse.json(
      { error: "Groq error", details: err.message },
      { status: 500 }
    );
  }
}
