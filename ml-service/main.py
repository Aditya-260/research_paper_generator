from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import re
import math
import string
import os
import csv
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load("sentinel_model.pkl")

COLLECTED_DATA_PATH = "collected_data.csv"
BASE_TRAIN_PATH     = "train.csv"          # original base dataset
MODEL_PATH          = "sentinel_model.pkl"
LAST_ACCURACY_PATH  = "last_accuracy.txt"

# Ensure collected data file exists
if not os.path.exists(COLLECTED_DATA_PATH):
    with open(COLLECTED_DATA_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label"])

class TextInput(BaseModel):
    text: str


def compute_linguistics(text: str) -> dict:
    """
    Compute linguistic signals that distinguish AI vs human writing.
    These are fast, interpretable, and require no extra model.
    """
    # Sentence tokenization
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s for s in sentences if s.strip()]

    words = text.split()
    total_words = len(words)

    if total_words == 0 or not sentences:
        return {}

    # ── Sentence length stats ──────────────────────────────────
    sent_lengths = [len(s.split()) for s in sentences]
    avg_sent_len = sum(sent_lengths) / len(sent_lengths)

    # Burstiness = coefficient of variation (std / mean)
    # HIGH burstiness → human (natural variation)
    # LOW  burstiness → AI   (machine-uniform sentences)
    if len(sent_lengths) > 1:
        variance = sum((x - avg_sent_len) ** 2 for x in sent_lengths) / len(sent_lengths)
        std = math.sqrt(variance)
        burstiness = round((std / avg_sent_len) * 100, 1) if avg_sent_len > 0 else 0
    else:
        burstiness = 0

    # ── Vocabulary diversity (Type-Token Ratio) ────────────────
    # HIGH TTR → human (richer, more varied vocabulary)
    # LOW  TTR → AI   (repetitive, templated phrasing)
    clean_words = [w.lower().strip(string.punctuation) for w in words if w.strip(string.punctuation)]
    unique_words = len(set(clean_words))
    ttr = round((unique_words / len(clean_words)) * 100, 1) if clean_words else 0

    # ── Average word length ────────────────────────────────────
    # AI tends to use longer, more formal words
    avg_word_len = round(sum(len(w) for w in clean_words) / len(clean_words), 1) if clean_words else 0

    # ── Punctuation density (commas + semicolons per 100 words) ─
    # AI overuses commas and semicolons for list-heavy structure
    punct_count = text.count(',') + text.count(';') + text.count(':')
    punct_density = round((punct_count / total_words) * 100, 1)

    # ── Passive voice rate ─────────────────────────────────────
    # AI heavily favors passive voice in academic writing
    # Heuristic: "was/were/is/are/been/being" + past participle
    passive_matches = re.findall(
        r'\b(was|were|is|are|been|being)\s+\w+ed\b',
        text, re.IGNORECASE
    )
    passive_rate = round((len(passive_matches) / len(sentences)) * 100, 1)

    # ── Transition phrase density ──────────────────────────────
    # AI writing is packed with academic transitions
    transitions = [
        "furthermore", "moreover", "however", "nevertheless", "consequently",
        "therefore", "thus", "in conclusion", "in summary", "notably",
        "specifically", "additionally", "subsequently", "correspondingly",
        "in contrast", "as a result", "it is worth noting", "it should be noted"
    ]
    text_lower = text.lower()
    transition_count = sum(text_lower.count(t) for t in transitions)
    transition_density = round((transition_count / len(sentences)) * 100, 1)

    # ── Repetition score ───────────────────────────────────────
    # Count how many words appear more than 3 times (AI repeats key terms)
    from collections import Counter
    word_freq = Counter(clean_words)
    repeated = sum(1 for count in word_freq.values() if count > 3)
    repetition_score = round((repeated / len(word_freq)) * 100, 1) if word_freq else 0

    return {
        "sentence_count": len(sentences),
        "word_count": total_words,
        "avg_sentence_length": round(avg_sent_len, 1),
        "burstiness": burstiness,
        "vocab_diversity": ttr,
        "avg_word_length": avg_word_len,
        "punctuation_density": punct_density,
        "passive_voice_rate": passive_rate,
        "transition_density": transition_density,
        "repetition_score": repetition_score,
    }


def score_ai_likelihood(linguistics: dict) -> int:
    """
    Compute an overall 'AI Signature Score' (0–100) from linguistic features.
    Higher = more AI-like writing style.
    """
    if not linguistics:
        return 50

    score = 50  # start neutral

    # Burstiness: low = AI (subtract from score baseline)
    b = linguistics.get("burstiness", 50)
    if b < 20:
        score += 15
    elif b < 40:
        score += 8
    elif b > 70:
        score -= 10

    # Vocab diversity: low = AI
    ttr = linguistics.get("vocab_diversity", 60)
    if ttr < 40:
        score += 12
    elif ttr < 55:
        score += 5
    elif ttr > 75:
        score -= 8

    # Avg sentence length: long = AI
    asl = linguistics.get("avg_sentence_length", 15)
    if asl > 25:
        score += 10
    elif asl > 20:
        score += 5
    elif asl < 12:
        score -= 8

    # Punctuation density: high = AI
    pd = linguistics.get("punctuation_density", 5)
    if pd > 10:
        score += 8
    elif pd > 7:
        score += 3

    # Passive voice: high = AI
    pv = linguistics.get("passive_voice_rate", 10)
    if pv > 30:
        score += 10
    elif pv > 15:
        score += 4

    # Transition density: high = AI
    td = linguistics.get("transition_density", 10)
    if td > 20:
        score += 8
    elif td > 10:
        score += 3

    # Repetition: high = AI
    rs = linguistics.get("repetition_score", 10)
    if rs > 25:
        score += 7
    elif rs > 15:
        score += 3

    return max(0, min(100, score))


@app.post("/detect")
def detect(input: TextInput):
    text = input.text.strip()

    # ML model prediction
    label = model.predict([text])[0]
    proba = model.predict_proba([text])[0]
    confidence = round(float(max(proba)) * 100, 2)

    # Sentence-level scores
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentence_scores = []
    for s in sentences:
        if s.strip():
            p = model.predict_proba([s])[0]
            sentence_scores.append({
                "sentence": s,
                "ai_probability": round(float(p[1]) * 100, 2)
            })

    # Linguistic analysis
    linguistics = compute_linguistics(text)
    ai_signature = score_ai_likelihood(linguistics)

    return {
        "label": "AI" if label == 1 else "Human",
        "confidence": confidence,
        "ai_signature_score": ai_signature,
        "sentences": sentence_scores,
        "linguistics": linguistics,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# ══════════════════════════════════════════════════════════════════════════════
# Dataset collection & retraining endpoints
# ══════════════════════════════════════════════════════════════════════════════

class SampleInput(BaseModel):
    text: str
    label: str  # "Human" or "AI"


@app.post("/submit-sample")
def submit_sample(input: SampleInput):
    """Append a user-labeled text sample to the collected dataset."""
    label_int = 0 if input.label == "Human" else 1
    text = input.text.strip()
    if len(text.split()) < 10:
        return {"error": "Text too short (minimum 10 words)"}
    with open(COLLECTED_DATA_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([text, label_int])
    return {"status": "saved", "label": input.label}


@app.get("/dataset-stats")
def dataset_stats():
    """Return counts of collected samples and last model accuracy."""
    human_count = 0
    ai_count    = 0
    try:
        df = pd.read_csv(COLLECTED_DATA_PATH)
        human_count = int((df["label"] == 0).sum())
        ai_count    = int((df["label"] == 1).sum())
    except Exception:
        pass

    last_accuracy = None
    if os.path.exists(LAST_ACCURACY_PATH):
        try:
            last_accuracy = float(open(LAST_ACCURACY_PATH).read().strip())
        except Exception:
            pass

    return {
        "human": human_count,
        "ai": ai_count,
        "total": human_count + ai_count,
        "last_accuracy": last_accuracy,
    }


@app.post("/retrain")
def retrain():
    """
    Retrain the model by merging:
      1. The base retrain.py embedded dataset (from retrain.py's HUMAN_SAMPLES + AI_SAMPLES)
      2. All user-collected samples in collected_data.csv
    Hot-reloads the model into memory without restarting the server.
    """
    global model

    # ── Load base dataset from retrain.py ──────────────────────────────────
    # We import the lists directly to avoid re-running the whole script
    import importlib.util, sys
    spec = importlib.util.spec_from_file_location("retrain", "retrain.py")
    retrain_module = importlib.util.load_from_spec = None  # avoid caching issues
    retrain_src = open("retrain.py", encoding="utf-8").read()

    # Parse HUMAN_SAMPLES and AI_SAMPLES out of retrain.py safely
    ns: dict = {}
    # Only execute the data definition part (before the training code)
    exec_lines = []
    for line in retrain_src.splitlines():
        if line.strip().startswith("print(") or "train_test_split" in line or "model.fit" in line:
            break
        exec_lines.append(line)
    try:
        exec("\n".join(exec_lines), ns)
        human_base = [{"text": t, "label": 0} for t in ns.get("HUMAN_SAMPLES", [])]
        ai_base    = [{"text": t, "label": 1} for t in ns.get("AI_SAMPLES", [])]
        base_df = pd.DataFrame(human_base + ai_base)
    except Exception:
        base_df = pd.DataFrame(columns=["text", "label"])

    # ── Load user-collected samples ─────────────────────────────────────────
    try:
        collected_df = pd.read_csv(COLLECTED_DATA_PATH)
        collected_df = collected_df[collected_df["text"].str.split().str.len() >= 10]
    except Exception:
        collected_df = pd.DataFrame(columns=["text", "label"])

    # ── Merge and deduplicate ───────────────────────────────────────────────
    combined = pd.concat([base_df, collected_df], ignore_index=True)
    combined = combined.drop_duplicates(subset="text").sample(frac=1, random_state=42).reset_index(drop=True)

    if len(combined) < 10:
        return {"error": "Not enough data to retrain. Add more samples first."}

    X = combined["text"]
    y = combined["label"].astype(int)

    # ── Train ───────────────────────────────────────────────────────────────
    new_model = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=1,
            strip_accents="unicode",
        )),
        ("clf", LogisticRegression(
            C=0.5,
            max_iter=1000,
            class_weight="balanced",
            solver="lbfgs",
        )),
    ])

    # Cross-val if enough data, else just train on all
    cv_mean = 0.0
    cv_std  = 0.0
    if len(combined) >= 20:
        folds = min(5, len(combined) // 4)
        scores = cross_val_score(new_model, X, y, cv=folds, scoring="accuracy")
        cv_mean = float(scores.mean())
        cv_std  = float(scores.std())

    # Final fit on all data
    new_model.fit(X, y)

    # Quick test accuracy on a 20% split (if large enough)
    test_accuracy = cv_mean  # default to CV score
    if len(combined) >= 20:
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        new_model_test = Pipeline([
            ("tfidf", TfidfVectorizer(max_features=10000, ngram_range=(1, 3), sublinear_tf=True, min_df=1)),
            ("clf", LogisticRegression(C=0.5, max_iter=1000, class_weight="balanced", solver="lbfgs")),
        ])
        new_model_test.fit(X_tr, y_tr)
        test_accuracy = float(accuracy_score(y_te, new_model_test.predict(X_te)))

    # ── Save and hot-reload ─────────────────────────────────────────────────
    joblib.dump(new_model, MODEL_PATH)
    model = new_model  # hot-reload in memory

    open(LAST_ACCURACY_PATH, "w").write(str(test_accuracy))

    human_ct = int((y == 0).sum())
    ai_ct    = int((y == 1).sum())

    return {
        "status": "retrained",
        "accuracy": round(test_accuracy, 4),
        "cv_mean":  round(cv_mean, 4),
        "cv_std":   round(cv_std, 4),
        "total":    len(combined),
        "human_count": human_ct,
        "ai_count":    ai_ct,
    }