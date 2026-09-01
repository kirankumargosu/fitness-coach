"""Free-text food description -> estimated macros, via Groq.

Deliberately a thin, direct HTTP call (Groq's API is OpenAI-compatible)
rather than pulling in the `groq` SDK as a dependency — one function,
easy to read end to end, nothing hidden behind a client object.

This never touches the database — it just turns text into numbers.
Storing the result is the caller's job (see crud.create_nutrition_entry).
"""
import json
import os

import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

REQUIRED_FIELDS = [
    "food",
    "calories",
    "protein_g",
    "carbs_g",
    "saturated_fat_g",
    "unsaturated_fat_g",
]

SYSTEM_ESTIMATE_PROMPT = """You are a nutrition estimation assistant. Given a free-text \
description of food someone ate, estimate its nutritional content using \
typical serving sizes and standard nutrition data. Respond with ONLY a JSON \
object, no other text, in exactly this shape:
{
  "food": "<short, cleaned-up name/summary of what was eaten>",
  "calories": <number, kcal>,
  "protein_g": <number, grams>,
  "carbs_g": <number, grams>,
  "saturated_fat_g": <number, grams>,
  "unsaturated_fat_g": <number, grams>
}
Always give your best numeric estimate, even for vague descriptions — never \
omit a field or return null. Use 0 only when a macro is genuinely absent \
(e.g. black coffee has 0 fat)."""

# SYSTEM_ASK_PROMPT = """You are a friendly, knowledgeable nutrition assistant. \
# Answer the user's question directly and practically — suggest specific foods, \
# dishes, or approaches where relevant. Keep your answer concise (a few \
# sentences to a short paragraph), conversational, and actionable. Respond in \
# plain text, not JSON."""

SYSTEM_ASK_PROMPT = """You are a friendly, knowledgeable nutrition assistant. \
Answer the user's question directly and practically using their logged daily intake context \
if provided. Suggest specific foods, dishes, or approaches where relevant. \
Keep your answer concise (a few sentences to a short paragraph), conversational, and actionable. \
Respond in plain text, not JSON."""

class NutritionAIError(Exception):
    """Raised for any failure talking to or parsing the AI's response —
    the router turns this into a clean 502 rather than a raw traceback."""

def ask_nutrition_question(question: str, context: str | None = None) -> str:
    """Answers a nutrition question (e.g. meal suggestions) as plain text.
    Deliberately separate from estimate_nutrition and never touches the
    database — there's no code path here that could accidentally log
    something. Logging only ever happens via create_nutrition_entry,
    called from a different endpoint entirely.
    """
    if not GROQ_API_KEY:
        raise NutritionAIError("GROQ_API_KEY is not configured on the server.")

    messages = [{"role": "system", "content": SYSTEM_ASK_PROMPT}]

    # Include the user's daily log context if present
    if context:
        messages.append({
            "role": "system",
            "content": f"User's logged intake for today:\n{context}"
        })

    messages.append({"role": "user", "content": question})

    try:
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "temperature": 0.5,
            },
            timeout=20.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise NutritionAIError(f"Couldn't reach the nutrition AI: {exc}") from exc

    try:
        return response.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as exc:
        raise NutritionAIError("The AI didn't return an answer.") from exc

def estimate_nutrition(description: str) -> dict:
    if not GROQ_API_KEY:
        raise NutritionAIError("GROQ_API_KEY is not configured on the server.")

    try:
        response = httpx.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_ESTIMATE_PROMPT},
                    {"role": "user", "content": description},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=20.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise NutritionAIError(f"Couldn't reach the nutrition AI: {exc}") from exc

    try:
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except (KeyError, IndexError, ValueError) as exc:
        raise NutritionAIError("The AI didn't return a valid estimate.") from exc

    missing = [f for f in REQUIRED_FIELDS if f not in parsed]
    if missing:
        raise NutritionAIError(f"AI response missing fields: {', '.join(missing)}")

    return parsed