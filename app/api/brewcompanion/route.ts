import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt, history = [] } = await req.json();

  const messages = [
    {
      role: "system",
      content: "Du er BrewCompanion, en bryggeassistent som hjelper med mjød, batchlogg og prosess."
    },
    ...history,
    { role: "user", content: prompt }
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://batchlogg.vercel.app",
      "X-Title": "BrewCompanion"
    },
    body: JSON.stringify({
      model: "minimax/minimax-m3",
      messages,
      temperature: 0.7
    })
  });

  const data = await response.json();
  return NextResponse.json({ answer: data.choices[0].message.content });
}
