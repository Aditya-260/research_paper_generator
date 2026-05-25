import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

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

  const response = await fetch("http://127.0.0.1:8000/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();
  return NextResponse.json({
    ...data,
    extractedText: text.slice(0, 500),
  });
}