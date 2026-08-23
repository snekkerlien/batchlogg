import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",   // trygg, anbefalt, ikke deprekert
      messages: [
        {
          role: "user",
          content: `
Du er en bryggemester. Svar kort, presist og på norsk.
Bruk kun relevant informasjon.
Unngå unødvendig tekst.

VIKTIG:
Hvis brukeren nevner liter, skal alle ingredienser og mengder skaleres nøyaktig til den batch-størrelsen.

Spørsmål:
${prompt}
`
        }
      ],
      max_tokens: 300,
    });

    const reply = response.choices[0]?.message?.content ?? "";

    if (!reply.trim()) {
      return NextResponse.json(
        { error: "AI returnerte tomt svar" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("GROQ CHAT ERROR:", err);
    return NextResponse.json(
      { error: "Groq-chat-feil", details: err.message },
      { status: 500 }
    );
  }
}
