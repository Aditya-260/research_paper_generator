import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { Groq } from "groq-sdk";

export async function POST(req: NextRequest) {
  let text = "";

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const { text: extracted } = await extractText(buffer, { mergePages: true });
    text = extracted;
  } else {
    const body = await req.json();
    text = body.text;
  }

  // ML Service
  const response = await fetch("http://127.0.0.1:8000/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();

  let llmVerdict = null;
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert AI content detector. Analyze the provided text and determine if it was written by an AI (e.g., ChatGPT, LLaMA) or a Human.
Pay close attention to linguistic markers:
- AI often uses uniform sentence lengths, passive voice, and transition phrases ("Furthermore", "Moreover", "It is worth noting").
- Human academic writing has more varied sentence lengths and natural flow.
Return ONLY a JSON object in this format: {"label": "AI" or "Human", "probability": <number 0-100 representing AI probability>, "reasoning": "<short explanation, max 2 sentences>"}`
          },
          { role: "user", content: text.slice(0, 4000) }
        ],
        response_format: { type: "json_object" }
      });
      llmVerdict = JSON.parse(completion.choices[0]?.message?.content || "{}");
    }
  } catch (error) {
    console.error("Groq detection failed:", error);
  }

  return NextResponse.json({
    ...data,
    llmVerdict,
    extractedText: text.slice(0, 500),
  });
}