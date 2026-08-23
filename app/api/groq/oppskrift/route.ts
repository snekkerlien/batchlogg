import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    const prompt = `
Du er en ekspert på mjød, ølbrygging, cider, vin og fermentering.
Lag en komplett oppskrift basert på brukerens input.

VIKTIG:
- Oppskriften skal alltid skaleres til nøyaktig ${body.volume} liter ferdig vørter.
- Ikke bruk melk, krem, fløte eller andre meieriprodukter i fermentering.
- Det skal aldri legges til noe som inneholder fett eller melk i selve bryggeprosessen.
- Hvis stilen er "kremet", skal kremethet kun komme fra servering eller etter-fermentering (f.eks. topping, skum, emulsjon), aldri i gjæringskaret, med mindre man bruker f.eks laktose.
- Ikke legg til mer vann enn nødvendig for å nå ${body.volume} liter totalvolum.
- Ingrediensene skal være realistiske for stilen som er valgt, og mengdene skal være korrekte for batch-størrelsen.
- Unngå unødvendige eller farlige ingredienser.
- Ikke kom med unødvendige detaljer som kan forstyrre brukeren.
- Oppgi alltid vanlige typer gjær og bruk alltid gram, desiliter eller liter, ikke bruk spiseskje og lignende måleenheter

Skriv ALLTID i dette formatet:

Ingredienser:
- punktliste

Fremgangsmåte:
1. steg
2. steg

Notater:
- punktliste

Skriv på norsk.
Ikke legg til ekstra seksjoner.

Navn: ${body.name}
Ingredienser: ${body.ingredients}
Stil: ${body.stil ?? "standard"}
Volum: ${body.volume} liter
`;

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 800,
    });

    const oppskriftTekst = response.choices[0]?.message?.content ?? "";

    if (!oppskriftTekst.trim()) {
      return NextResponse.json(
        { error: "AI returnerte tomt svar" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      oppskrift: oppskriftTekst,
    });

  } catch (err: any) {
    console.error("GROQ ERROR:", err);
    return NextResponse.json(
      { error: "Groq-feil", details: err.message },
      { status: 500 }
    );
  }
}
