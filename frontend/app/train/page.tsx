"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface DatasetStats {
  total: number;
  human: number;
  ai: number;
  last_accuracy: number | null;
}

interface RetrainResult {
  accuracy: number;
  cv_mean: number;
  cv_std: number;
  human_count: number;
  ai_count: number;
  total: number;
}

const QUICK_EXAMPLES = [
  {
    label: "Human" as const,
    tag: "Real paper excerpt",
    text: "We recruited 45 participants (23 female, mean age 28.4 years). Three participants were excluded due to equipment failure, leaving 42 in the final analysis. The task took approximately 25 minutes to complete. Accuracy on the practice trials was high (M = 94.2%, SD = 3.1%), suggesting participants understood the instructions.",
  },
  {
    label: "AI" as const,
    tag: "AI-generated excerpt",
    text: "The proposed methodology demonstrates superior performance across all evaluated benchmark datasets. Furthermore, the comprehensive experimental evaluation conclusively establishes the efficacy of the novel approach. It is worth noting that the results exhibit remarkable consistency across diverse evaluation scenarios, thereby validating the robustness of the proposed framework.",
  },
];

export default function TrainPage() {
  const [text, setText] = useState("");
  const [label, setLabel] = useState<"Human" | "AI" | null>(null);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<RetrainResult | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/dataset-stats");
      if (res.ok) setStats(await res.json());
    } catch {
      // ML service may not be up yet
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const submitSample = async () => {
    if (!text.trim() || !label) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/submit-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), label }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSuccessMsg(`Saved as ${label}! Keep adding more samples to improve the model.`);
      setText("");
      setLabel(null);
      await fetchStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setError("Could not save sample. Make sure the ML service is running.");
    } finally {
      setSubmitting(false);
    }
  };

  const runRetrain = async () => {
    setRetraining(true);
    setError(null);
    setRetrainResult(null);
    try {
      const res = await fetch("http://localhost:8000/retrain", { method: "POST" });
      if (!res.ok) throw new Error("Retrain failed");
      const data = await res.json();
      setRetrainResult(data);
      await fetchStats();
    } catch {
      setError("Retraining failed. Check the ML service logs.");
    } finally {
      setRetraining(false);
    }
  };

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = wordCount >= 15 && label !== null;

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-purple-400 hover:underline text-sm mb-6 block">
          ← Back to Home
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-400 mb-2">Model Training Studio</h1>
            <p className="text-gray-400">
              Label text samples as Human or AI to continuously improve the detection model.
              More labeled data = better accuracy.
            </p>
          </div>
          {stats && (
            <div className="shrink-0 bg-gray-900 border border-gray-800 rounded-xl p-4 text-center min-w-36">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400 mt-0.5">total samples</p>
              <div className="flex gap-2 mt-2 justify-center text-xs">
                <span className="text-green-400">{stats.human} Human</span>
                <span className="text-gray-600">/</span>
                <span className="text-red-400">{stats.ai} AI</span>
              </div>
              {stats.last_accuracy && (
                <p className="text-purple-400 text-xs mt-1 font-semibold">
                  {(stats.last_accuracy * 100).toFixed(1)}% accuracy
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Examples */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-3">
            New to labeling? Load a quick example to see what each type looks like:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => { setText(ex.text); setLabel(ex.label); }}
                className={`text-left p-4 rounded-xl border transition ${
                  ex.label === "Human"
                    ? "bg-green-900/20 border-green-800 hover:border-green-600"
                    : "bg-red-900/20 border-red-800 hover:border-red-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    ex.label === "Human" ? "bg-green-700 text-white" : "bg-red-700 text-white"
                  }`}>{ex.label}</span>
                  <span className="text-xs text-gray-500">{ex.tag}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{ex.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Label form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <label className="text-sm text-gray-400 mb-2 block">
            Paste text to label <span className="text-gray-600">(min 15 words)</span>
          </label>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-purple-500 transition resize-none min-h-40 placeholder-gray-600"
            placeholder="Paste a paragraph from a research paper, abstract, or any academic text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2 mb-5">
            <span className="text-xs text-gray-600">{wordCount} words</span>
            {wordCount > 0 && wordCount < 15 && (
              <span className="text-xs text-yellow-500">Need at least 15 words</span>
            )}
          </div>

          {/* Label selector */}
          <p className="text-sm text-gray-400 mb-3">Who wrote this?</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => setLabel("Human")}
              className={`py-4 rounded-xl font-semibold text-sm transition border-2 ${
                label === "Human"
                  ? "border-green-500 bg-green-900/40 text-green-300"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-green-700"
              }`}
            >
              ✍️ Human Written
              <p className="text-xs font-normal mt-1 opacity-70">
                Real paper, real human author
              </p>
            </button>
            <button
              onClick={() => setLabel("AI")}
              className={`py-4 rounded-xl font-semibold text-sm transition border-2 ${
                label === "AI"
                  ? "border-red-500 bg-red-900/40 text-red-300"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-red-700"
              }`}
            >
              🤖 AI Generated
              <p className="text-xs font-normal mt-1 opacity-70">
                Written by ChatGPT, LLaMA, etc.
              </p>
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={submitSample}
            disabled={!canSubmit || submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Spinner /> Saving…</>
              : `Save as ${label ?? "…"} sample`}
          </button>

          {/* Feedback */}
          {successMsg && (
            <div className="mt-4 bg-green-900/30 border border-green-700 rounded-xl px-4 py-3 text-green-300 text-sm flex items-center gap-2">
              <span>✓</span> {successMsg}
            </div>
          )}
          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}
        </div>

        {/* Retrain panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white font-semibold text-lg mb-1">Retrain the Model</h2>
              <p className="text-gray-400 text-sm">
                After adding enough samples, retrain the model to improve detection accuracy.
                We recommend at least <span className="text-purple-300 font-semibold">50 samples per class</span> for good results.
              </p>
            </div>
            <button
              onClick={runRetrain}
              disabled={retraining || (stats ? stats.total < 10 : true)}
              className="shrink-0 ml-6 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-2 whitespace-nowrap"
            >
              {retraining ? <><Spinner /> Retraining…</> : "⚡ Retrain Now"}
            </button>
          </div>

          {/* Progress indicator */}
          {stats && (
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Human samples</span>
                  <span>{stats.human} / 50</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${Math.min((stats.human / 50) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>AI samples</span>
                  <span>{stats.ai} / 50</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-red-500 transition-all duration-500"
                    style={{ width: `${Math.min((stats.ai / 50) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Retrain result */}
          {retrainResult && (
            <div className="mt-5 bg-purple-900/20 border border-purple-700 rounded-xl p-5">
              <p className="text-purple-300 font-semibold mb-3">Retraining Complete!</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {(retrainResult.accuracy * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Test accuracy</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {(retrainResult.cv_mean * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">CV accuracy</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{retrainResult.total}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Total samples used</p>
                </div>
              </div>
              <p className="text-green-400 text-sm mt-4 text-center">
                Model updated! Go test it on the Detect page.
              </p>
            </div>
          )}

          {retraining && (
            <div className="mt-5 animate-pulse space-y-2">
              <div className="h-2 bg-gray-800 rounded w-3/4" />
              <div className="h-2 bg-gray-800 rounded w-1/2" />
              <p className="text-xs text-gray-600 mt-2">Training on combined dataset…</p>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-300 mb-3">Tips for better labeling</p>
          <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
            <li>Use text from <span className="text-gray-400">real published papers</span> (arXiv, PubMed, Google Scholar) for Human samples</li>
            <li>Use papers generated in the <span className="text-gray-400">Generate tab</span> of this app for AI samples</li>
            <li>Aim for <span className="text-gray-400">paragraph-length text</span> (50–200 words) — not single sentences</li>
            <li>Include text from <span className="text-gray-400">different domains</span> (CS, Biology, Physics, Economics, Psychology)</li>
            <li>The more <span className="text-gray-400">balanced</span> Human vs AI counts are, the better the model</li>
          </ul>
        </div>

      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
