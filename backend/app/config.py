import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / ".env")

ATLAS_BASE_URL = os.getenv("ATLAS_BASE_URL", "https://sandbox.atriptech.com/")
ATLAS_CLIENT_KEY = os.getenv("CLIENT_KEY", "")
ATLAS_SECRET_KEY = os.getenv("SECRET_KEY", "")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'trip_continuity.db'}")

MONITOR_ENABLED = os.getenv("MONITOR_ENABLED", "true").lower() != "false"
MONITOR_INTERVAL_MINUTES = int(os.getenv("MONITOR_INTERVAL_MINUTES", "5"))
MONITOR_TRIGGER_SCORE = float(os.getenv("MONITOR_TRIGGER_SCORE", "65"))

GDELT_URL = os.getenv("GDELT_URL", "https://api.gdeltproject.org/api/v2/doc/doc")
GDELT_QUERY_TERMS = os.getenv("GDELT_QUERY_TERMS", "conflict OR war OR airspace OR strike OR protest OR unrest")