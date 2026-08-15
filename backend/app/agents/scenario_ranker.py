def rank_scenarios(scenario: dict, context: dict) -> tuple[dict, float]:
    total = sum(b["cost"] for b in context["bookings"]) or 1.0
    cost = max(0.0, scenario.get("additional_cost", 0) or 0.0)
    cost_efficiency = max(0.0, 100.0 - (cost / total) * 500)
    value_preserved = max(0.0, 100.0 - (cost / total) * 100)
    residual_map = {"LOW": 90.0, "MEDIUM": 60.0, "HIGH": 25.0}
    residual = residual_map.get(scenario.get("residual_risk", "MEDIUM"), 60.0)
    keep = 1 if scenario["plan_code"] == "C" else 0
    continuity = 90.0 if scenario["plan_code"] == "C" else 80.0
    user_fit = 85.0 if scenario["plan_code"] != "C" else 70.0

    scores = {
        "additional_cost": round(cost, 2),
        "value_preserved": round(value_preserved, 1),
        "trip_continuity": round(continuity, 1),
        "residual_risk": round(residual, 1),
        "user_fit": round(user_fit, 1),
        "cost_efficiency": round(cost_efficiency, 1),
    }
    overall = round(
        min(100.0, 0.15 * continuity
        + 0.25 * value_preserved
        + 0.20 * residual
        + 0.20 * cost_efficiency
        + 0.20 * user_fit),
        1,
    )
    if keep and context["risk_event"].get("severity", 0) * context["risk_event"].get("confidence", 0) > 0.5:
        overall = round(overall * 0.75, 1)
    return scores, overall