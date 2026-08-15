import json

from ..integrations.atlas import adapter
from ..models import Booking
from . import llm_client
from .scenario_ranker import rank_scenarios


def generate_scenarios(trip, bookings: list[Booking], affected_ids: list[int], risk_event, alternatives: list) -> list[dict]:
    context = {
        "trip": {
            "name": trip.name,
            "origin": trip.origin,
            "destination": trip.destination,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
        },
        "bookings": [
            {
                "id": b.id,
                "type": b.booking_type,
                "title": b.title,
                "location": b.location,
                "start_time": b.start_time,
                "end_time": b.end_time,
                "cost": b.cost,
                "change_deadline": b.change_deadline,
                "refundable_pct": b.refundable_pct,
                "status": b.status,
            }
            for b in bookings
        ],
        "affected_booking_ids": affected_ids,
        "risk_event": {
            "type": risk_event.event_type,
            "location": risk_event.location,
            "severity": risk_event.severity,
            "confidence": risk_event.confidence,
            "start_time": risk_event.start_time,
            "duration": risk_event.expected_duration,
        },
        "alternatives": [
            {
                "flight": a.flight_number,
                "origin": a.origin,
                "destination": a.destination,
                "dep_time": a.dep_time,
                "arr_time": a.arr_time,
                "price": a.price,
                "stops": a.stops,
            }
            for a in alternatives[:6]
        ],
    }

    scenarios = _llm_scenarios(context)
    if not scenarios:
        scenarios = _fallback_scenarios(context)

    for sc in scenarios:
        sc["scores"], sc["overall_score"] = rank_scenarios(sc, context)
        sc["value_preserved_pct"] = round(min(100.0, 100.0 - sc.get("additional_cost", 0) / max(1, _total_cost(context)) * 100), 1)
        sc["additional_cost"] = sc.get("additional_cost", 0)
        sc["residual_risk"] = sc.get("residual_risk", "MEDIUM")
        sc["actions"] = _fix_rebook_actions(sc["actions"], alternatives)
    return scenarios


def _fix_rebook_actions(actions: list[dict], alternatives: list) -> list[dict]:
    valid = {(a.flight_number, a.origin, a.destination) for a in alternatives}
    first = alternatives[0] if alternatives else None
    fixed = []
    for a in actions:
        if a.get("action") == "REBOOK":
            detail = a.get("detail", "")
            ok = any(fn in detail for fn, _, _ in valid) and any(loc in detail for loc in ("CGK", "NRT"))
            if not ok and first:
                a["detail"] = f"Rebook flight {first.flight_number} {first.origin}->{first.destination} dep {first.dep_time} (${first.price})"
                a["new_time"] = first.dep_time
            chosen = next((alt for alt in alternatives if alt.flight_number in a.get("detail", "")), first)
            if chosen:
                a["provider_ref"] = chosen.provider_ref
                a["flight_number"] = chosen.flight_number
                a["flight_price"] = chosen.price
        fixed.append(a)
    return fixed


def _total_cost(context: dict) -> float:
    return sum(b["cost"] for b in context["bookings"])


def _llm_scenarios(context: dict) -> list[dict]:
    alt_flights = ", ".join(
        f"{a['flight']} {a['origin']}->{a['destination']} dep {a['dep_time']} ${a['price']}" for a in context["alternatives"]
    ) or "none"
    system = (
        "You are a travel continuity planner. Given a trip, an external risk event, "
        "and alternative flights, produce EXACTLY three coordinated recovery scenarios "
        f"as JSON: {{\"scenarios\": [{{\"plan_code\": \"A\", \"title\": \"...\", "
        "\"description\": \"...\", \"actions\": [{\"booking_id\": <int>, \"action\": "
        "\"RESCHEDULE|KEEP|REBOOK|CANCEL\", \"new_time\": \"...\", \"detail\": \"...\"}], "
        "\"additional_cost\": <float>, \"residual_risk\": \"LOW|MEDIUM|HIGH\"}]}}. "
        "STRICT RULES: Only use flights from the alternatives list "
        f"({alt_flights}); never invent flight numbers. "
        "Every booking_id in the trip must appear in actions exactly once (KEEP if unchanged). "
        "Scenario A departs earlier, Scenario B delays the trip, Scenario C keeps the current plan."
    )
    result = llm_client.complete_json(system, json.dumps(context))
    scenarios = (result or {}).get("scenarios", [])
    return _complete_actions(scenarios, context)


def _complete_actions(scenarios: list[dict], context: dict) -> list[dict]:
    valid_ids = {b["id"] for b in context["bookings"]}
    for sc in scenarios:
        actions = sc.get("actions") or []
        seen = {a.get("booking_id") for a in actions if a.get("booking_id") in valid_ids}
        for b in context["bookings"]:
            if b["id"] not in seen:
                actions.append({"booking_id": b["id"], "action": "KEEP", "new_time": "", "detail": "Unchanged"})
        sc["actions"] = actions
    return scenarios


def _fallback_scenarios(context: dict) -> list[dict]:
    alt = context["alternatives"]
    earliest = alt[0] if alt else None
    return [
        {
            "plan_code": "A",
            "title": "Depart Earlier",
            "description": "Fly to destination earlier before the risk event materializes.",
            "actions": [
                {"booking_id": b["id"], "action": "REBOOK", "new_time": earliest["dep_time"] if earliest else "", "detail": f"Alternative flight {earliest['flight']} at {earliest['dep_time']} (${earliest['price']})"}
                if b["type"] == "flight"
                else {"booking_id": b["id"], "action": "RESCHEDULE", "new_time": b["start_time"], "detail": "Move earlier by one day"}
                if b["id"] in context["affected_booking_ids"] and b["type"] in ("hotel", "transport", "activity")
                else {"booking_id": b["id"], "action": "KEEP", "new_time": "", "detail": "Unchanged"}
                for b in context["bookings"]
            ],
            "additional_cost": 140.0,
            "residual_risk": "LOW",
        },
        {
            "plan_code": "B",
            "title": "Delay Trip",
            "description": "Shift the whole trip to after the risk event subsides.",
            "actions": [
                {"booking_id": b["id"], "action": "RESCHEDULE", "new_time": b["start_time"], "detail": "Shift dates by two days"}
                if b["id"] in context["affected_booking_ids"]
                else {"booking_id": b["id"], "action": "KEEP", "new_time": "", "detail": "Unchanged"}
                for b in context["bookings"]
            ],
            "additional_cost": 80.0,
            "residual_risk": "LOW",
        },
        {
            "plan_code": "C",
            "title": "Keep Current Plan",
            "description": "No change now; accept exposure if the disruption materializes.",
            "actions": [{"booking_id": b["id"], "action": "KEEP", "new_time": "", "detail": "Unchanged"} for b in context["bookings"]],
            "additional_cost": 0.0,
            "residual_risk": "HIGH",
        },
    ]