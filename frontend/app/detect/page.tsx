"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface SentenceScore {
  sentence: string;
  ai_probability: number;
}

interface DetectResult {
  label: string;
  confidence: number;
  sentences: SentenceScore[];
  extractedText?: string;
}

export default function DetectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [directText, setDirectText] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<"upload" | "direct">("upload");

  useEffect(() => {
    const saved = localStorage.getItem("sentinel_detect_text");
    if (saved) {
      setDirectText(saved);
      setMode("direct");
      localStorage.removeItem("sentinel_detect_text");
    }
  }, []);

  const detectFromText = async (text: string) => {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const detectFromFile = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/detect", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const getColor = (prob: number) => {
    if (prob > 70) return "bg-red-500/20 border-l-4 border-red-500";
    if (prob > 40) return "bg-yellow-500/20 border-l-4 border-yellow-500";
    return "bg-green-500/20 border-l-4 border-green-500";
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-purple-400 hover:underline text-sm mb-6 block">← Back to Home</Link>
        <h1 className="text-3xl font-bold mb-2 text-purple-400">AI Content Detector</h1>
        <p className="text-gray-400 mb-8">Analyze a research paper to detect how much of it is AI-generated.</p>

        {/* Mode Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setMode("upload")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              mode === "upload"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}>
            📄 Upload PDF
          </button>
          <button
            onClick={() => setMode("direct")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              mode === "direct"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}>
            ⚡ Direct Detection
            {directText && (
              <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Ready</span>
            )}
          </button>
        </div>

        {/* Upload Mode */}
        {mode === "upload" && (
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped?.type === "application/pdf") setFile(dropped);
              }}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer mb-6
                ${dragOver ? "border-purple-400 bg-purple-900/20" : "border-gray-600 hover:border-purple-500"}`}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-4xl mb-3">📄</p>
              {file ? (
                <div>
                  <p className="text-green-400 font-semibold">{file.name}</p>
                  <p className="text-gray-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-300 font-semibold">Drag & drop your PDF here</p>
                  <p className="text-gray-500 text-sm mt-1">or click to browse</p>
                  <p className="text-xs text-purple-400 mt-3">💡 Download the generated paper as PDF and upload here</p>
                </div>
              )}
            </div>
            <button
              onClick={detectFromFile}
              disabled={!file || loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-xl font-semibold transition">
              {loading ? "Analyzing..." : "Detect AI Content"}
            </button>
          </div>
        )}

        {/* Direct Mode */}
        {mode === "direct" && (
          <div>
            {directText ? (
              <div className="bg-gray-800 border border-green-700 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>
                  <p className="text-green-400 font-semibold text-sm">Paper loaded from generator</p>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-4">
                  {directText.slice(0, 300)}...
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6 text-center">
                <p className="text-gray-400">No paper loaded yet.</p>
                <Link href="/generate" className="text-purple-400 hover:underline text-sm mt-2 block">
                  ← Go generate a paper first
                </Link>
              </div>
            )}
            <button
              onClick={() => directText && detectFromText(directText)}
              disabled={!directText || loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-3 rounded-xl font-semibold transition">
              {loading ? "Analyzing..." : "⚡ Detect AI Content Directly"}
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 mt-10">

            {/* Overall Result */}
            <div className={`rounded-xl p-6 text-center ${
              result.label === "AI"
                ? "bg-red-900/30 border border-red-500"
                : "bg-green-900/30 border border-green-500"
            }`}>
              <p className="text-sm text-gray-400 mb-2">Detection Result</p>
              <p className={`text-4xl font-bold mb-2 ${
                result.label === "AI" ? "text-red-400" : "text-green-400"
              }`}>
                {result.label === "AI" ? "🤖 AI Generated" : "✍️ Human Written"}
              </p>
              <p className="text-gray-300">
                Confidence: <span className="font-bold text-white">{result.confidence}%</span>
              </p>
            </div>

            {/* Confidence Bar */}
            <div className="bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-400 mb-3">AI Probability Score</p>
              <div className="w-full bg-gray-700 rounded-full h-5">
                <div
                  className={`h-5 rounded-full transition-all duration-700 ${
                    result.label === "AI" ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Human (0%)</span>
                <span>AI (100%)</span>
              </div>
            </div>

            {/* Extracted Text Preview */}
            {result.extractedText && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-purple-400 font-semibold mb-3">Extracted Text Preview</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{result.extractedText}...</p>
              </div>
            )}

            {/* Sentence Level */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-purple-400 font-semibold mb-4">Sentence-Level Analysis</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {result.sentences.map((s, i) => (
                  <div key={i} className={`p-3 rounded-lg ${getColor(s.ai_probability)}`}>
                    <p className="text-gray-200 text-sm mb-1">{s.sentence}</p>
                    <p className="text-xs text-gray-400">
                      AI Probability: <span className="font-bold text-white">{s.ai_probability}%</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-500 rounded inline-block"/> High AI (&gt;70%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-yellow-500 rounded inline-block"/> Medium (40–70%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-500 rounded inline-block"/> Low (&lt;40%)
                </span>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}