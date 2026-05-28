# Sentinel AI — AI Content Intelligence Platform

A full-stack ML platform to **generate** synthetic research papers using Groq LLaMA and **detect** AI-generated writing with sentence-level precision.

---

## Features

| Feature | Description |
|---|---|
| 🧠 AI Paper Generator | Generate structured research papers (abstract, intro, methodology, results, conclusion + dataset) using Groq LLaMA-3.3-70B |
| 🔍 AI Content Detector | Detect AI-written text via a trained scikit-learn ML model with sentence-level color-coded analysis |
| 📄 PDF Upload | Upload any research paper PDF for authenticity checking |
| ✏️ Paste Text | Paste arbitrary text directly for instant detection |
| ⚡ Direct Detection | One-click route from generated paper → detector (no download needed) |
| 📊 CSV Export | Export synthetic dataset from any generated paper |
| 📄 PDF Download | Download the full generated paper as a formatted PDF |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| AI Generation | Groq API (LLaMA-3.3-70B-Versatile) |
| PDF Parsing | `unpdf` (via Next.js API route) |
| PDF Export | `jsPDF` |
| ML Service | FastAPI + scikit-learn (TF-IDF + classifier) |
| Model Format | `joblib` pickle |

---

## Project Structure

```
research_paper_generator/
├── frontend/                   # Next.js app
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── generate/page.tsx   # Paper generator UI
│   │   ├── detect/page.tsx     # AI detector UI
│   │   ├── api/generate/       # Groq API route
│   │   └── api/detect/         # PDF parsing + ML proxy route
│   ├── .env.local              # Your secrets (not committed)
│   └── .env.example            # Template for required env vars
└── ml-service/                 # FastAPI Python service
    ├── main.py                 # FastAPI app with /detect endpoint
    ├── sentinel_model.pkl      # Trained sklearn model
    ├── sentinel_ml.ipynb       # Training notebook
    ├── train.csv               # Training data
    └── requirements.txt        # Python dependencies
```

---

## Setup & Run

### 1. Clone the repo

```bash
git clone https://github.com/your-username/research_paper_generator.git
cd research_paper_generator
```

### 2. Start the ML Service

```bash
cd ml-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Service runs at: `http://localhost:8000`  
Health check: `http://localhost:8000/health`

### 3. Start the Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local and add your GROQ_API_KEY
npm run dev
```

App runs at: `http://localhost:3000`

### 4. Get a Groq API Key

Sign up free at [console.groq.com](https://console.groq.com) and create an API key.  
Add it to `frontend/.env.local`:

```
GROQ_API_KEY=gsk_your_key_here
```

---

## Usage

### Generate a Paper
1. Go to `/generate`
2. Enter a research topic, pick domain/complexity/style
3. Click **Generate Document** — takes ~10 seconds
4. Download as PDF/CSV or send directly to the detector

### Detect AI Content
1. Go to `/detect`
2. Choose a mode:
   - **Upload PDF** — drag & drop a PDF file
   - **Paste Text** — paste any text directly
   - **Direct** — auto-populated from the generator
3. Click **Detect** and view the sentence-level results

---

## ML Model

The detection model is a `scikit-learn` pipeline (TF-IDF → classifier) trained on a labeled dataset of AI-generated vs. human-written academic text (`train.csv`).

Training notebook: `ml-service/sentinel_ml.ipynb`

---

## License

MIT