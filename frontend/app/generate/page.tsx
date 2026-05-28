"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DatasetRow {
  metric: string;
  value: number | string;
  unit: string;
}

interface PaperResult {
  title: string;
  abstract: string;
  introduction: string;
  methodology: string;
  results: string;
  conclusion: string;
  dataset: DatasetRow[];
}

const EXAMPLES: { topic: string; domain: string; emoji: string }[] = [
  { topic: "Deep Learning in Medical Imaging", domain: "Computer Science", emoji: "🧠" },
  { topic: "Transformer Models for Natural Language Processing", domain: "Computer Science", emoji: "🤖" },
  { topic: "Federated Learning for Privacy-Preserving AI", domain: "Computer Science", emoji: "🔐" },
  { topic: "Graph Neural Networks in Drug Discovery", domain: "Biology", emoji: "💊" },
  { topic: "CRISPR Gene Editing and Ethical Implications", domain: "Biology", emoji: "🧬" },
  { topic: "Quantum Computing and Cryptography", domain: "Physics", emoji: "⚛️" },
  { topic: "Dark Matter Detection Methods", domain: "Physics", emoji: "🌌" },
  { topic: "Behavioral Economics and Decision Making", domain: "Economics", emoji: "📈" },
  { topic: "AI Impact on Global Labor Markets", domain: "Economics", emoji: "💼" },
  { topic: "Cognitive Biases in Social Media Algorithms", domain: "Psychology", emoji: "🧩" },
  { topic: "Mental Health Interventions Using VR Therapy", domain: "Psychology", emoji: "🎯" },
  { topic: "Explainable AI in Clinical Decision Support", domain: "Computer Science", emoji: "🏥" },
];

export default function GeneratePage() {
  const [topic, setTopic] = useState("");
  const [domain, setDomain] = useState("Computer Science");

  const [style, setStyle] = useState("Academic");
  const [result, setResult] = useState<PaperResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const router = useRouter();

  const generate = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, domain, style }),
      });
      const data = await res.json();
      if (data.error) {
        setError("Generation failed: " + data.error);
        return;
      }
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copySection = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadCSV = () => {
    if (!result) return;
    const csv = [
      "metric,value,unit",
      ...result.dataset.map((r) => `${r.metric},${r.value},${r.unit}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dataset.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!result) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(result.title, margin, 20, { maxWidth });

    let y = 35;
    const sections: (keyof PaperResult)[] = [
      "abstract",
      "introduction",
      "methodology",
      "results",
      "conclusion",
    ];

    for (const section of sections) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(section.toUpperCase(), margin, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(result[section] as string, maxWidth);

      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 6;
      }
      y += 8;
    }

    doc.save(`${result.title.replace(/\s+/g, "_")}.pdf`);
  };

  const detectDirectly = () => {
    if (!result) return;
    const fullText = `${result.title}
${result.abstract}
${result.introduction}
${result.methodology}
${result.results}
${result.conclusion}`.trim();
    localStorage.setItem("sentinel_detect_text", fullText);
    router.push("/detect");
  };

  const sections: (keyof PaperResult)[] = [
    "abstract",
    "introduction",
    "methodology",
    "results",
    "conclusion",
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-purple-400 hover:underline text-sm mb-6 block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2 text-purple-400">AI Document Generator</h1>
        <p className="text-gray-400 mb-8">Generate a full research paper using Groq LLaMA in seconds.</p>

        {/* Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <label className="text-sm text-gray-400 mb-1 block">Research Topic</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500 transition"
                placeholder="e.g. Deep Learning in Medical Imaging"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && topic && !loading && generate()}
              />
              {/* Example suggestions */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">✨ Try an example:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.topic}
                      type="button"
                      onClick={() => {
                        setTopic(ex.topic);
                        setDomain(ex.domain);
                      }}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                        topic === ex.topic
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-300"
                      }`}
                    >
                      <span>{ex.emoji}</span>
                      {ex.topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Domain</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500 transition"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                <option>Computer Science</option>
                <option>Biology</option>
                <option>Physics</option>
                <option>Economics</option>
                <option>Psychology</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Writing Style</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-purple-500 transition"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option>Academic</option>
                <option>Technical</option>
                <option>Simplified</option>
              </select>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={!topic || loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                {/* Spinner */}
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Generating paper — this takes ~10s…
              </>
            ) : (
              "✨ Generate Document"
            )}
          </button>
        </div>

        {/* Loading state — pulsing skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="h-3 bg-gray-700 rounded w-24 mb-4" />
                <div className="space-y-2">
                  <div className="h-2.5 bg-gray-800 rounded w-full" />
                  <div className="h-2.5 bg-gray-800 rounded w-5/6" />
                  <div className="h-2.5 bg-gray-800 rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inline Error Banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-xl px-5 py-4 flex items-start gap-3 mb-6">
            <span className="text-red-400 text-lg mt-0.5">⚠</span>
            <div>
              <p className="text-red-300 font-semibold text-sm">Generation Failed</p>
              <p className="text-red-400 text-sm mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-300 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-white">{result.title}</h2>
              <span className="shrink-0 text-xs bg-green-900/40 border border-green-700 text-green-400 px-3 py-1 rounded-full">
                ✓ Generated
              </span>
            </div>

            {/* Paper Sections */}
            {sections.map((section) => (
              <div key={section} className="bg-gray-900 border border-gray-800 rounded-xl p-6 group relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-purple-400 font-semibold uppercase text-sm tracking-wide">
                    {section}
                  </h3>
                  <button
                    onClick={() => copySection(section, result[section] as string)}
                    className="text-xs text-gray-500 hover:text-purple-300 transition opacity-0 group-hover:opacity-100"
                  >
                    {copiedSection === section ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-gray-300 leading-relaxed">{result[section] as string}</p>
              </div>
            ))}

            {/* Dataset Table */}
            {result.dataset && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-purple-400 font-semibold uppercase text-sm tracking-wide mb-4">
                  Synthetic Dataset
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2">Metric</th>
                      <th className="text-left py-2">Value</th>
                      <th className="text-left py-2">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dataset.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800 text-gray-300 hover:bg-gray-800/50 transition">
                        <td className="py-2.5">{row.metric}</td>
                        <td className="py-2.5 font-mono text-purple-300">{row.value}</td>
                        <td className="py-2.5 text-gray-500">{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold text-lg">What do you want to do next?</h3>

              {/* Direct Detection */}
              <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 font-semibold">🔍 Detect AI Content Directly</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Send this paper straight to the detector — no downloading needed.
                    </p>
                  </div>
                  <button
                    onClick={detectDirectly}
                    className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ml-4"
                  >
                    Detect Now →
                  </button>
                </div>
              </div>

              {/* Download */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-white font-semibold mb-3">⬇ Download Paper</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={downloadCSV}
                    className="flex flex-col items-start bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-xl p-4 transition text-left"
                  >
                    <span className="text-2xl mb-2">📊</span>
                    <span className="text-white font-semibold text-sm">Download CSV</span>
                    <span className="text-gray-400 text-xs mt-1">Dataset table only</span>
                  </button>

                  <button
                    onClick={downloadPDF}
                    className="flex flex-col items-start bg-gray-700 hover:bg-gray-600 border border-green-700 rounded-xl p-4 transition text-left relative"
                  >
                    <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                      ⭐ Recommended
                    </span>
                    <span className="text-2xl mb-2">📄</span>
                    <span className="text-white font-semibold text-sm">Download PDF</span>
                    <span className="text-gray-400 text-xs mt-1">Full paper · best for detection</span>
                  </button>
                </div>
                <p className="text-xs text-green-400 mt-3">
                  💡 Tip: Download as PDF and upload it on the Detect page for a realistic demo!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}