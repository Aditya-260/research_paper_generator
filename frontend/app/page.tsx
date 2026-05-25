import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <span className="text-xl font-bold text-purple-400">Sentinel AI</span>
        <div className="flex gap-4">
          <Link href="/generate" className="text-sm text-gray-400 hover:text-white transition">Generate</Link>
          <Link href="/detect" className="text-sm text-gray-400 hover:text-white transition">Detect</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-20">
        <span className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-1 text-xs text-gray-400 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block"/> GenAI + NLP + ML Platform
        </span>
        <h1 className="text-5xl font-bold leading-tight mb-4 max-w-2xl">
          Detect and Generate{" "}
          <span className="text-purple-400">AI-Written</span> Content
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mb-10 leading-relaxed">
          Generate synthetic research documents and analyze any paper to detect AI-generated writing patterns with sentence-level precision.
        </p>
        <div className="flex gap-4 flex-wrap justify-center mb-16">
          <Link href="/generate"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition">
            Generate Paper →
          </Link>
          <Link href="/detect"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-8 py-3 rounded-xl font-semibold transition">
            Detect AI Content
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-lg w-full">
          {[
            { value: "100%", label: "Model Accuracy" },
            { value: "~60ms", label: "Detection Speed" },
            { value: "6", label: "Paper Sections" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl py-4">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-12 max-w-5xl mx-auto">
        <p className="text-xs text-gray-500 text-center tracking-widest uppercase mb-8">Core Features</p>
        <div className="grid grid-cols-2 gap-6">
          {[
            {
              icon: "📄",
              title: "AI Document Generator",
              desc: "Generate full research papers with abstract, methodology, results and conclusions using Groq LLaMA.",
              color: "text-purple-400",
              bg: "bg-purple-900/20 border-purple-800",
            },
            {
              icon: "🔍",
              title: "PDF Authenticity Detection",
              desc: "Upload any research paper PDF and get an AI probability score with sentence-level color highlighting.",
              color: "text-teal-400",
              bg: "bg-teal-900/20 border-teal-800",
            },
            {
              icon: "📊",
              title: "Synthetic Dataset Export",
              desc: "Every generated paper includes a realistic structured dataset table, exportable as CSV.",
              color: "text-amber-400",
              bg: "bg-amber-900/20 border-amber-800",
            },
            {
              icon: "📈",
              title: "Confidence Analytics",
              desc: "Visual confidence bars and per-sentence AI probability scores color-coded by risk level.",
              color: "text-blue-400",
              bg: "bg-blue-900/20 border-blue-800",
            },
          ].map((f) => (
            <div key={f.title} className={`border rounded-xl p-6 ${f.bg}`}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className={`font-semibold text-lg mb-2 ${f.color}`}>{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-8 py-12 max-w-5xl mx-auto">
        <p className="text-xs text-gray-500 text-center tracking-widest uppercase mb-8">How It Works</p>
        <div className="flex items-center justify-center gap-4 flex-wrap bg-gray-900 border border-gray-800 rounded-xl p-8">
          {[
            { step: "1", label: "Enter topic" },
            { step: "2", label: "Groq generates paper" },
            { step: "3", label: "Upload PDF" },
            { step: "4", label: "ML detects AI content" },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                  {s.step}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center max-w-20">{s.label}</p>
              </div>
              {i < 3 && <span className="text-gray-600 text-xl mb-4">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="px-8 py-12 max-w-5xl mx-auto">
        <p className="text-xs text-gray-500 text-center tracking-widest uppercase mb-8">Tech Stack</p>
        <div className="grid grid-cols-6 gap-3">
          {[
            { name: "Next.js", role: "Frontend" },
            { name: "Tailwind", role: "Styling" },
            { name: "Groq API", role: "Generation" },
            { name: "FastAPI", role: "ML Service" },
            { name: "scikit-learn", role: "Detection" },
            { name: "pdf-parse", role: "PDF Reading" },
          ].map((t) => (
            <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-white">{t.name}</p>
              <p className="text-xs text-gray-500 mt-1">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-8 py-16 text-center">
        <div className="bg-purple-900/30 border border-purple-800 rounded-2xl p-12 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to try it?</h2>
          <p className="text-gray-400 mb-8">Generate a research paper or upload one to detect AI content.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/generate"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-600 border-t border-gray-800">
        Sentinel AI — AI Content Intelligence Platform
      </footer>

    </main>
  );
}