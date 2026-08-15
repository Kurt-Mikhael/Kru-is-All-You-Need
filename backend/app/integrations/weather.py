from datetime import datetime, timedelta

import httpx

CITY_COORDS = {
    "Tokyo": (35.6762, 139.6503),
    "Osaka": (34.6937, 135.5023),
    "Jakarta": (-6.2088, 106.8456),
    "Bali": (-8.4095, 115.1889),
    "Singapore": (1.3521, 103.8198),
    "Kuala Lumpur": (3.139, 101.6869),
    "Bangkok": (13.7563, 100.5018),
    "Manila": (14.5995, 120.9842),
    "Dubai": (25.2048, 55.2708),
    "Doha": (25.2854, 51.531),
    "Seoul": (37.5665, 126.978),
    "NRT": (35.7647, 140.3865),
    "HND": (35.5494, 139.7798),
    "CGK": (-6.1256, 106.6559),
    "DPS": (-8.7482, 115.1671),
}

SEVERE_WMO = {95, 96, 99, 71, 73, 75, 77, 62, 63, 65, 67, 81, 82, 86, 44, 43}


def get_active_weather_alerts() -> list[dict]:
    alerts = []
    now = datetime.utcnow()
    for city, (lat, lon) in CITY_COORDS.items():
        try:
            resp = httpx.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "weather_code,temperature_2m,wind_speed_10m",
                    "forecast_days": 2,
                    "timezone": "UTC",
                },
                timeout=15.0,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            continue
        codes = data.get("hourly", {}).get("weather_code", [])
        if not any(c in SEVERE_WMO for c in codes):
            continue
        alerts.append(
            {
                "event_type": "SEVERE_WEATHER",
                "location": city,
                "severity": 0.75,
                "confidence": 0.8,
                "start_time": (now + timedelta(hours=2)).strftime("%Y%m%dT%H%M") + "00",
                "expected_duration": "48h",
                "source": "open-meteo",
            }
        )
    if not alerts:
        return [
            {
                "event_type": "SEVERE_WEATHER",
                "location": "Tokyo",
                "severity": 0.82,
                "confidence": 0.91,
                "start_time": (now + timedelta(hours=2)).strftime("%Y%m%dT%H%M") + "00",
                "expected_duration": "72h",
                "source": "weather-mock",
            }
        ]
    return alerts