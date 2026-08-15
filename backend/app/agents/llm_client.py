import json

from ..config import GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL


def complete_json(system: str, user: str) -> dict:
    if not GROQ_API_KEY:
        return {}
    try:
        from openai import OpenAI

        client = OpenAI(base_url=GROQ_BASE_URL, api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
            max_tokens=1200,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {}


def complete_text(system: str, user: str) -> str:
    if not GROQ_API_KEY:
        return ""
    try:
        from openai import OpenAI

        client = OpenAI(base_url=GROQ_BASE_URL, api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.5,
            max_tokens=500,
        )
        return resp.choices[0].message.content or ""
    except Exception:
        return ""


def is_available() -> bool:
    return bool(GROQ_API_KEY)