from ...schemas import AlternativeFlight


def map_search_response(data: dict) -> list[AlternativeFlight]:
    if data.get("status") != 0 or not data.get("routings"):
        return []
    flights = []
    for r in data["routings"]:
        segments = r.get("fromSegments", []) or []
        if not segments:
            continue
        first = segments[0]
        last = segments[-1]
        total = (r.get("adultPrice", 0) or 0) + (r.get("adultTax", 0) or 0)
        flights.append(
            AlternativeFlight(
                flight_number=first.get("flightNumber", ""),
                carrier=first.get("carrier", ""),
                origin=first.get("depAirport", ""),
                destination=last.get("arrAirport", ""),
                dep_time=first.get("depTime", first.get("depDateTime", "")),
                arr_time=last.get("arrTime", last.get("arrDateTime", "")),
                price=round(float(total), 2),
                currency=r.get("currency", "USD"),
                segments=len(segments),
                stops=max(0, len(segments) - 1),
                provider_ref=r.get("routingIdentifier", ""),
            )
        )
    return flights