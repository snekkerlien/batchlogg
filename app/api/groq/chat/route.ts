import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("=== Incoming request to /api/groq/chat ===");

    const body = await req.json();
    console.log("Request JSON:", body);

    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid message format:", messages);
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    console.log("Frontend messages:", messages);

    const groqMessages = [
      {
        role: "system",
        content: `
You are BrewCompanion, an expert brewing assistant.
Respond like an experienced homebrewer who loves what they are doing.

LANGUAGE RULE:
- Always respond in English, but you can also change language to match the user upon request.

CONVERSATION RULES:
- Ask only essential clarifying questions.
- Once the user has answered the essentials, stop asking questions and move forward.
- Never repeat questions the user has already answered.
- Keep answers friendly, curious, and conversational.
- Avoid jumping ahead or assuming what the user wants.
- If the user expresses uncertainty, give simple guidance instead of asking more questions.
- Don't assume you know what the user is gong to make before they tell you.
- Keep responses concise.
- Aim for 2–4 short paragraphs maximum.
- Avoid overly long explanations.
- Never randomly capitalize words.
- Never split or emphasize words mid-sentence.
- Always write beer styles in normal casing (e.g., "session ale").

FORMAT RULES:
- Use clean line breaks.
- Never output Markdown tables.
- Never compress content into a single line.
- Use short paragraphs.
- Keep answers readable and natural.

BREWING RULES:
- If the user mentions liters, scale all ingredients precisely.
- Stay on topic: brewing, fermentation, ingredients, scaling, techniques.
        `,
      },

      ...messages.slice(-12).map((m: any) => ({
        role: m.sender === "ai" ? "assistant" : "user",
        content: m.text,
      })),
    ];

    console.log("Groq messages:", groqMessages);

    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });

    console.log("Sending request to Groq…");

    const response = await client.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      messages: groqMessages as any,
      max_tokens: 1024,
    });

    console.log("Groq raw response:", response);

    let reply = response.choices[0]?.message?.content ?? "";

    reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    reply = reply.split("<think>").pop()?.trim() ?? "";



    console.log("Final reply:", reply);

    if (!reply.trim()) {
      console.error("AI returned empty reply");
      return NextResponse.json(
        { error: "AI returned an empty reply" },
        { status: 500 }
      );
    }

    console.log("=== /api/groq/chat completed successfully ===");

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("=== GROQ CHAT ERROR ===");
    console.error(err);
    console.error("Stack:", err.stack);

    return NextResponse.json(
      { error: "Groq chat error", details: err.message },
      { status: 500 }
    );
  }
}
