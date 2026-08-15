from ...schemas import AlternativeFlight

FIXTURES = {
    ("CGK", "NRT"): [
        AlternativeFlight(
            flight_number="FA171",
            carrier="FA",
            origin="CGK",
            destination="NRT",
            dep_time="20260921T080000",
            arr_time="20260921T180000",
            price=61.13,
            currency="USD",
            segments=1,
            stops=0,
            provider_ref="FIXTURE-CGK-NRT-1",
        ),
        AlternativeFlight(
            flight_number="FA172",
            carrier="FA",
            origin="CGK",
            destination="NRT",
            dep_time="20260920T200000",
            arr_time="20260921T060000",
            price=48.50,
            currency="USD",
            segments=1,
            stops=0,
            provider_ref="FIXTURE-CGK-NRT-2",
        ),
        AlternativeFlight(
            flight_number="FA300",
            carrier="FA",
            origin="CGK",
            destination="HND",
            dep_time="20260922T090000",
            arr_time="20260922T190000",
            price=72.00,
            currency="USD",
            segments=1,
            stops=0,
            provider_ref="FIXTURE-CGK-NRT-3",
        ),
    ]
}

FALLBACK_OFFER = AlternativeFlight(
    flight_number="FA171",
    carrier="FA",
    origin="",
    destination="",
    dep_time="",
    arr_time="",
    price=61.13,
    currency="USD",
    segments=1,
    stops=0,
    provider_ref="FIXTURE-FALLBACK",
)


def get_fixture(origin: str, destination: str) -> list[AlternativeFlight]:
    return FIXTURES.get((origin.upper(), destination.upper()), [FALLBACK_OFFER])