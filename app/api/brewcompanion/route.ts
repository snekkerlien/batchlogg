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
      model: "nvidia/nemotron-3.5-lightning",
      messages,
      temperature: 0.7
    })
  });

  const data = await response.json();
  console.log("OPENROUTER RAW RESPONSE:", JSON.stringify(data, null, 2));

  const answer =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.content ??
    data?.output_text ??
    "No answer";

  return NextResponse.json({ answer });
}
