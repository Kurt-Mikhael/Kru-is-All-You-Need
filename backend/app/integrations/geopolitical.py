import time

import httpx

from ..config import GDELT_QUERY_TERMS, GDELT_URL

GEOPOLITICAL_EVENT_TYPE = "GEOPOLITICAL_ESCALATION"
_RATE_LIMIT_S = 5.2

FCDO_BASE = "https://www.gov.uk/api/content/foreign-travel-advice"

CITY_TO_COUNTRY = {
    "Tokyo": "japan",
    "Osaka": "japan",
    "Jakarta": "indonesia",
    "Bali": "indonesia",
    "Singapore": "singapore",
    "Kuala Lumpur": "malaysia",
    "Bangkok": "thailand",
    "Manila": "philippines",
    "Dubai": "united-arab-emirates",
    "Doha": "qatar",
    "Seoul": "south-korea",
}

ALERT_SEVERITY = {
    "avoid_all_travel_to_parts": 0.60,
    "avoid_all_but_essential_travel_to_parts": 0.70,
    "avoid_all_but_essential": 0.75,
    "avoid_all": 0.90,
}

COUNTRY_AIRPORTS = {
    "japan": {"NRT", "HND", "KIX", "NGO"},
    "indonesia": {"CGK", "DPS", "SUB"},
    "singapore": {"SIN"},
    "malaysia": {"KUL"},
    "thailand": {"BKK", "DMK"},
    "philippines": {"MNL"},
    "united-arab-emirates": {"DXB", "AUH"},
    "qatar": {"DOH"},
    "south-korea": {"ICN", "GMP"},
}


def _severity_from_tone(tone: float) -> float:
    sev = -tone / 10.0
    return round(min(0.95, max(0.15, sev)), 2)


def _fcdo_event(location: str) -> dict | None:
    country = CITY_TO_COUNTRY.get(location)
    if not country:
        country = next(
            (c for c, airports in COUNTRY_AIRPORTS.items() if location.upper() in airports),
            None,
        )
    if not country:
        return None
    try:
        resp = httpx.get(f"{FCDO_BASE}/{country}", timeout=20.0)
        resp.raise_for_status()
        details = resp.json().get("details", {})
    except Exception:
        return None
    alerts = details.get("alert_status") or []
    if not alerts:
        return None
    severity = max((ALERT_SEVERITY.get(a, 0.5) for a in alerts), default=0.5)
    return {
        "event_type": GEOPOLITICAL_EVENT_TYPE,
        "location": location,
        "severity": severity,
        "confidence": 0.85,
        "start_time": (details.get("updated_at") or "")[:16].replace("-", "").replace(":", "") + "00",
        "expected_duration": "unlimited",
        "source": "FCDO",
    }


def _gdelt_event(location: str) -> dict | None:
    query = f'"{location}" ({GDELT_QUERY_TERMS})'
    try:
        resp = httpx.get(
            GDELT_URL,
            params={"query": query, "mode": "artlist", "format": "json", "maxrecords": 10},
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return None
    articles = data.get("articles", [])
    if not articles:
        return None
    tones = [float(a.get("tone", "0")) for a in articles if a.get("tone")]
    if not tones:
        return None
    avg_tone = sum(tones) / len(tones)
    return {
        "event_type": GEOPOLITICAL_EVENT_TYPE,
        "location": location,
        "severity": _severity_from_tone(avg_tone),
        "confidence": round(min(0.95, 0.5 + 0.05 * len(tones)), 2),
        "start_time": articles[0].get("seendate", "")[:12],
        "expected_duration": "48h",
        "source": "GDELT",
    }


def get_geopolitical_risks(locations: list[str]) -> list[dict]:
    events = []
    for idx, loc in enumerate(locations):
        event = _fcdo_event(loc)
        if not event:
            if idx > 0:
                time.sleep(_RATE_LIMIT_S)
            event = _gdelt_event(loc)
        if event:
            events.append(event)
    return events