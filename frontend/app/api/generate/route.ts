import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { topic, domain, style } = await req.json();

    const prompt = `Generate a structured research paper on the topic: "${topic}"
Domain: ${domain}
Audience: Standard (accessible to a broad, general academic audience)
Writing Style: ${style}

Return ONLY a valid JSON object with exactly these keys, no extra text, no markdown, no backticks:
{
  "title": "paper title here",
  "abstract": "abstract text here",
  "introduction": "introduction text here",
  "methodology": "methodology text here",
  "results": "results text here",
  "conclusion": "conclusion text here",
  "dataset": [
    {"metric": "Accuracy", "value": 0.95, "unit": "score"},
    {"metric": "Latency", "value": 120, "unit": "ms"},
    {"metric": "Precision", "value": 0.91, "unit": "score"},
    {"metric": "Recall", "value": 0.88, "unit": "score"}
  ]
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const text = response.choices[0].message.content || "";
    
    // Clean the response
    const clean = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Find JSON object in response
    const jsonStart = clean.indexOf("{");
    const jsonEnd = clean.lastIndexOf("}");
    
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "Invalid response from AI" }, { status: 500 });
    }

    const jsonStr = clean.slice(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}