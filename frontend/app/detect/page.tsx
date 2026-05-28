"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface SentenceScore {
  sentence: string;
  ai_probability: number;
}

interface Linguistics {
  sentence_count: number;
  word_count: number;
  avg_sentence_length: number;
  burstiness: number;
  vocab_diversity: number;
  avg_word_length: number;
  punctuation_density: number;
  passive_voice_rate: number;
  transition_density: number;
  repetition_score: number;
}

interface LLMVerdict {
  label: string;
  probability: number;
  reasoning: string;
}

interface DetectResult {
  label: string;
  confidence: number;
  ai_signature_score: number;
  sentences: SentenceScore[];
  extractedText?: string;
  linguistics?: Linguistics;
  llmVerdict?: LLMVerdict;
}

type Mode = "upload" | "direct";

// ── Linguistics metric config ──────────────────────────────────────────────
const METRIC_CONFIG: {
  key: keyof Linguistics;
  label: string;
  description: string;
  aiDirection: "high" | "low"; // which end signals AI
  unit: string;
  thresholds: [number, number]; // [human_max, ai_min]
}[] = [
  {
    key: "burstiness",
    label: "Sentence Burstiness",
    description: "Variation in sentence lengths. AI writes uniformly; humans vary naturally.",
    aiDirection: "low",
    unit: "%",
    thresholds: [60, 25],
  },
  {
    key: "vocab_diversity",
    label: "Vocabulary Diversity",
    description: "Ratio of unique words to total words (Type-Token Ratio). AI repeats terms more.",
    aiDirection: "low",
    unit: "%",
    thresholds: [65, 45],
  },
  {
    key: "passive_voice_rate",
    label: "Passive Voice Rate",
    description: "Frequency of passive constructions. AI heavily favors passive academic voice.",
    aiDirection: "high",
    unit: "%",
    thresholds: [15, 30],
  },
  {
    key: "transition_density",
    label: "Transition Phrase Density",
    description: 'Words like "furthermore", "consequently", "notably". AI overuses them.',
    aiDirection: "high",
    unit: "%",
    thresholds: [10, 20],
  },
  {
    key: "punctuation_density",
    label: "Punctuation Density",
    description: "Commas, semicolons and colons per 100 words. AI structures text more formally.",
    aiDirection: "high",
    unit: "/100w",
    thresholds: [7, 12],
  },
  {
    key: "repetition_score",
    label: "Word Repetition",
    description: "Percentage of words repeated more than 3 times. AI reuses key terms heavily.",
    aiDirection: "high",
    unit: "%",
    thresholds: [12, 22],
  },
  {
    key: "avg_sentence_length",
    label: "Avg. Sentence Length",
    description: "Average number of words per sentence. AI tends to write longer sentences.",
    aiDirection: "high",
    unit: "words",
    thresholds: [18, 25],
  },
  {
    key: "avg_word_length",
    label: "Avg. Word Length",
    description: "Average characters per word. AI favors formal, longer vocabulary.",
    aiDirection: "high",
    unit: "chars",
    thresholds: [4.5, 5.5],
  },
];

function getMetricStatus(
  value: number,
  aiDirection: "high" | "low",
  thresholds: [number, number]
): "human" | "neutral" | "ai" {
  const [humanMax, aiMin] = thresholds;
  if (aiDirection === "high") {
    if (value >= aiMin) return "ai";
    if (value <= humanMax) return "human";
    return "neutral";
  } else {
    if (value <= aiMin) return "ai";
    if (value >= humanMax) return "human";
    return "neutral";
  }
}

export default function DetectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [directText, setDirectText] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");

  useEffect(() => {
    const saved = localStorage.getItem("sentinel_detect_text");
    if (saved) {
      setDirectText(saved);
      setMode("direct");
      localStorage.removeItem("sentinel_detect_text");
    }
  }, []);

  const runDetection = async (text: string) => {
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
    const res = await fetch("/api/detect", { method: "POST", body: formData });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const getSentenceColor = (prob: number) => {
    if (prob > 70) return "bg-red-500/20 border-l-4 border-red-500";
    if (prob > 40) return "bg-yellow-500/20 border-l-4 border-yellow-500";
    return "bg-green-500/20 border-l-4 border-green-500";
  };

  // Combined score: lean on LLaMA if available, else ML model
  const combinedScore = result
    ? result.llmVerdict
      ? Math.round((result.llmVerdict.probability + result.ai_signature_score) / 2)
      : result.label === "AI"
        ? Math.round((result.confidence + result.ai_signature_score) / 2)
        : Math.round(((100 - result.confidence) + (100 - result.ai_signature_score)) / 2)
    : 0;

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-purple-400 hover:underline text-sm mb-6 block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2 text-purple-400">AI Content Detector</h1>
        <p className="text-gray-400 mb-8">
          Analyze any research paper to detect AI-generated writing with sentence-level precision.
        </p>

        {/* Mode Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setMode("upload")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
              mode === "upload"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            📄 Upload PDF
          </button>
          <button
            onClick={() => setMode("direct")}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              mode === "direct"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            ⚡ Direct Detection
            {directText && (
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Ready
              </span>
            )}
          </button>
        </div>

        {/* ── Upload Mode ── */}
        {mode === "upload" && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped?.type === "application/pdf") setFile(dropped);
              }}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer mb-6 ${
                dragOver
                  ? "border-purple-400 bg-purple-900/20"
                  : "border-gray-600 hover:border-purple-500"
              }`}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
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
                  <p className="text-xs text-purple-400 mt-3">
                    💡 Download the generated paper as PDF and upload here
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={detectFromFile}
              disabled={!file || loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition flex items-center justify-center gap-3"
            >
              {loading && <Spinner />}
              {loading ? "Analyzing…" : "Detect AI Content"}
            </button>
          </div>
        )}

        {/* ── Direct Mode ── */}
        {mode === "direct" && (
          <div>
            {directText ? (
              <div className="bg-gray-800 border border-green-700 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <p className="text-green-400 font-semibold text-sm">Paper loaded from generator</p>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-4">
                  {directText.slice(0, 300)}…
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
              onClick={() => directText && runDetection(directText)}
              disabled={!directText || loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition flex items-center justify-center gap-3"
            >
              {loading && <Spinner />}
              {loading ? "Analyzing…" : "⚡ Detect AI Content Directly"}
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="space-y-6 mt-10">

            {/* ── Dual Score Cards ── */}
            <div className="grid grid-cols-3 gap-4">
              {/* LLaMA / ML Model verdict */}
              <div className={`col-span-1 rounded-xl p-5 text-center flex flex-col justify-center ${
                (result.llmVerdict ? result.llmVerdict.label === "AI" : result.label === "AI")
                  ? "bg-red-900/30 border border-red-500"
                  : "bg-green-900/30 border border-green-500"
              }`}>
                <p className="text-xs text-gray-400 mb-1">
                  {result.llmVerdict ? "LLaMA Analysis" : "ML Model"}
                </p>
                <p className={`text-2xl font-bold ${
                  (result.llmVerdict ? result.llmVerdict.label === "AI" : result.label === "AI")
                    ? "text-red-400" : "text-green-400"
                }`}>
                  {(result.llmVerdict ? result.llmVerdict.label === "AI" : result.label === "AI") ? "🤖 AI" : "✍️ Human"}
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  <span className="font-bold text-white">
                    {result.llmVerdict ? result.llmVerdict.probability : result.confidence}%
                  </span> confidence
                </p>
              </div>

              {/* AI Signature Score */}
              <div className="col-span-1 rounded-xl p-5 text-center bg-purple-900/20 border border-purple-700">
                <p className="text-xs text-gray-400 mb-1">AI Signature</p>
                <p className={`text-2xl font-bold ${
                  result.ai_signature_score > 60 ? "text-red-400"
                  : result.ai_signature_score > 40 ? "text-yellow-400"
                  : "text-green-400"
                }`}>
                  {result.ai_signature_score}
                  <span className="text-base text-gray-400">/100</span>
                </p>
                <p className="text-gray-400 text-xs mt-1">linguistics score</p>
              </div>

              {/* Combined Score */}
              <div className="col-span-1 rounded-xl p-5 text-center flex flex-col justify-center bg-gray-800 border border-gray-600">
                <p className="text-xs text-gray-400 mb-1">Overall Verdict</p>
                <p className={`text-2xl font-bold ${
                  combinedScore > 60 ? "text-red-400"
                  : combinedScore > 40 ? "text-yellow-400"
                  : "text-green-400"
                }`}>
                  {combinedScore > 60 ? "Likely AI" : combinedScore > 40 ? "Uncertain" : "Likely Human"}
                </p>
                <p className="text-gray-400 text-xs mt-1">combined analysis</p>
              </div>
            </div>

            {/* ── LLaMA Reasoning ── */}
            {result.llmVerdict && (
              <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-5 mt-4">
                <div className="flex gap-3">
                  <span className="text-blue-400 text-xl">🧠</span>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-300 mb-1">LLaMA's Reasoning</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {result.llmVerdict.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Confidence Bar ── */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-gray-400">ML Model Confidence</p>
                <span className="text-xs text-gray-500">{result.confidence}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-700 ${
                    result.label === "AI" ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Human</span><span>AI</span>
              </div>
            </div>

            {/* ── Writing Analytics Panel ── */}
            {result.linguistics && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-purple-400 font-semibold text-lg">Writing Analytics</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Linguistic signals that distinguish AI from human writing
                    </p>
                  </div>
                  {/* Stats summary */}
                  <div className="flex gap-2 text-xs">
                    <span className="bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-gray-400">
                      {result.linguistics.word_count} words
                    </span>
                    <span className="bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-gray-400">
                      {result.linguistics.sentence_count} sentences
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {METRIC_CONFIG.map((metric) => {
                    const value = result.linguistics![metric.key];
                    const status = getMetricStatus(value, metric.aiDirection, metric.thresholds);
                    const barColor =
                      status === "ai" ? "bg-red-500"
                      : status === "human" ? "bg-green-500"
                      : "bg-yellow-500";
                    const statusLabel =
                      status === "ai" ? "AI-like"
                      : status === "human" ? "Human-like"
                      : "Neutral";
                    const statusColor =
                      status === "ai" ? "text-red-400 bg-red-900/30 border-red-800"
                      : status === "human" ? "text-green-400 bg-green-900/30 border-green-800"
                      : "text-yellow-400 bg-yellow-900/30 border-yellow-800";

                    // Normalize bar width for display (cap at 100%)
                    const barMax = metric.thresholds[1] * 1.5;
                    const barWidth = Math.min((value / barMax) * 100, 100);

                    return (
                      <div key={metric.key} className="bg-gray-800 rounded-xl p-4 group">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-white text-sm font-semibold">{metric.label}</p>
                            <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                              {metric.description}
                            </p>
                          </div>
                          <span className={`shrink-0 ml-3 text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="text-white font-mono text-sm font-bold whitespace-nowrap">
                            {value}{metric.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Extracted Text Preview ── */}
            {result.extractedText && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-purple-400 font-semibold mb-3">Extracted Text Preview</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{result.extractedText}…</p>
              </div>
            )}

            {/* ── Sentence-Level Analysis ── */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-purple-400 font-semibold">Sentence-Level Analysis</h3>
                <span className="text-xs text-gray-500">{result.sentences.length} sentences</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {result.sentences.map((s, i) => (
                  <div key={i} className={`p-3 rounded-lg ${getSentenceColor(s.ai_probability)}`}>
                    <p className="text-gray-200 text-sm mb-1">{s.sentence}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            s.ai_probability > 70 ? "bg-red-500"
                            : s.ai_probability > 40 ? "bg-yellow-500"
                            : "bg-green-500"
                          }`}
                          style={{ width: `${s.ai_probability}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 whitespace-nowrap">
                        <span className="font-bold text-white">{s.ai_probability}%</span> AI
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-500 rounded inline-block" /> High AI (&gt;70%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-yellow-500 rounded inline-block" /> Medium (40–70%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-500 rounded inline-block" /> Low (&lt;40%)
                </span>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}