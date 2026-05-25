from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load("sentinel_model.pkl")

class TextInput(BaseModel):
    text: str

@app.post("/detect")
def detect(input: TextInput):
    text = input.text.strip()
    label = model.predict([text])[0]
    proba = model.predict_proba([text])[0]
    confidence = round(float(max(proba)) * 100, 2)

    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentence_scores = []
    for s in sentences:
        if s.strip():
            p = model.predict_proba([s])[0]
            sentence_scores.append({
                "sentence": s,
                "ai_probability": round(float(p[1]) * 100, 2)
            })

    return {
        "label": "AI" if label == 1 else "Human",
        "confidence": confidence,
        "sentences": sentence_scores
    }

@app.get("/health")
def health():
    return {"status": "ok"}