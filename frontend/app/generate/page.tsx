"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GeneratePage() {
  const [topic, setTopic] = useState("");
  const [domain, setDomain] = useState("Computer Science");
  const [complexity, setComplexity] = useState("Medium");
  const [style, setStyle] = useState("Academic");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const router = useRouter();

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, domain, complexity, style }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Generation failed: " + data.error);
        return;
      }
      setResult(data);
    } catch (err) {
      alert("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const csv = ["metric,value,unit",
      ...result.dataset.map((r: any) => `${r.metric},${r.value},${r.unit}`)
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
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(result.title, margin, 20, { maxWidth });

    let y = 35;
    const sections = ["abstract","introduction","methodology","results","conclusion"];

    for (const section of sections) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(section.toUpperCase(), margin, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(result[section], maxWidth);
      
      for (const line of lines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      }
      y += 8;
    }

    doc.save(`${result.title.replace(/\s+/g, "_")}.pdf`);
  };

  const detectDirectly = () => {
    const fullText = `
${result.title}
${result.abstract}
${result.introduction}
${result.methodology}
${result.results}
${result.conclusion}
    `.trim();
    localStorage.setItem("sentinel_detect_text", fullText);
    router.push("/detect");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-400 hover:underline text-sm mb-6 block">← Back to Home</Link>
        <h1 className="text-3xl font-bold mb-8 text-blue-400">AI Document Generator</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="col-span-2">
            <label className="text-sm text-gray-400 mb-1 block">Research Topic</label>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Deep Learning in Medical Imaging"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Domain</label>
            <select className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white outline-none"
              value={domain} onChange={e => setDomain(e.target.value)}>
              <option>Computer Science</option>
              <option>Biology</option>
              <option>Physics</option>
              <option>Economics</option>
              <option>Psychology</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Complexity</label>
            <select className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white outline-none"
              value={complexity} onChange={e => setComplexity(e.target.value)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Writing Style</label>
            <select className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white outline-none"
              value={style} onChange={e => setStyle(e.target.value)}>
              <option>Academic</option>
              <option>Technical</option>
              <option>Simplified</option>
            </select>
          </div>
        </div>

        <button onClick={generate} disabled={!topic || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 py-3 rounded-xl font-semibold transition mb-10">
          {loading ? "Generating..." : "Generate Document"}
        </button>

        {result && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{result.title}</h2>

            {["abstract","introduction","methodology","results","conclusion"].map(section => (
              <div key={section} className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-blue-400 font-semibold uppercase text-sm mb-3">{section}</h3>
                <p className="text-gray-300 leading-relaxed">{result[section]}</p>
              </div>
            ))}

            {result.dataset && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-blue-400 font-semibold uppercase text-sm mb-4">Synthetic Dataset</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2">Metric</th>
                      <th className="text-left py-2">Value</th>
                      <th className="text-left py-2">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dataset.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-gray-700 text-gray-300">
                        <td className="py-2">{row.metric}</td>
                        <td className="py-2">{row.value}</td>
                        <td className="py-2">{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold text-lg">What do you want to do next?</h3>

              {/* Way 1 - Direct Detection */}
              <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 font-semibold">🔍 Detect AI Content Directly</p>
                    <p className="text-gray-400 text-sm mt-1">Send this paper straight to the detector — no downloading needed.</p>
                  </div>
                  <button onClick={detectDirectly}
                    className="bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ml-4">
                    Detect Now →
                  </button>
                </div>
              </div>

              {/* Way 2 - Download */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <p className="text-white font-semibold mb-3">⬇ Download Paper</p>
                <div className="grid grid-cols-2 gap-3">

                  {/* CSV */}
                  <button onClick={downloadCSV}
                    className="flex flex-col items-start bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-xl p-4 transition text-left">
                    <span className="text-2xl mb-2">📊</span>
                    <span className="text-white font-semibold text-sm">Download CSV</span>
                    <span className="text-gray-400 text-xs mt-1">Dataset table only</span>
                  </button>

                  {/* PDF */}
                  <button onClick={downloadPDF}
                    className="flex flex-col items-start bg-gray-700 hover:bg-gray-600 border border-green-700 rounded-xl p-4 transition text-left relative">
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