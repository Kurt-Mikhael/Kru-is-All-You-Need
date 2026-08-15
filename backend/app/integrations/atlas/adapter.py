import time

from ...schemas import AlternativeFlight
from . import client, fixtures, mapper

DEMO_PASSENGER = {
    "name": "DOE/JOHN",
    "passengerType": 0,
    "gender": "M",
    "birthday": "19900101",
    "cardType": "PP",
    "cardNum": "A12345678",
    "cardIssuePlace": "US",
    "cardExpired": "20300101",
    "nationality": "US",
}
DEMO_CONTACT = {
    "name": "DOE/JOHN",
    "email": "john.doe@example.com",
    "mobile": "0001-87291810",
}


def search_alternative_flights(origin: str, destination: str, dep_date: str, passengers: int = 1) -> list[AlternativeFlight]:
    try:
        data = client.search_flights(origin, destination, dep_date, passengers)
        flights = mapper.map_search_response(data)
        if flights:
            return flights
    except Exception:
        pass
    return fixtures.get_fixture(origin, destination)


def book_alternative_flight(alternative: AlternativeFlight, passengers: int = 1) -> dict:
    try:
        verify = client.verify_flight(alternative.provider_ref)
        session_id = verify.get("sessionId")
        if not session_id:
            raise RuntimeError(f"no sessionId: {verify}")
        order = client.create_order(session_id, [DEMO_PASSENGER] * passengers, DEMO_CONTACT)
        if order.get("status") != 0:
            raise RuntimeError(f"order failed: {order}")
        order_no = order.get("orderNo")
        client.pay_order(order_no)
        ticketed = False
        for _ in range(12):
            time.sleep(5)
            query = client.query_order(order_no)
            if query.get("orderStatus") == 2 and query.get("ticketStatus") == 1:
                ticketed = True
                break
        return {
            "provider": "ATLAS",
            "order_no": order_no,
            "pnr": order.get("pnrCode", ""),
            "total": order.get("totalPrice", alternative.price),
            "currency": order.get("currency", "USD"),
            "ticketed": ticketed,
        }
    except Exception:
        return {
            "provider": "MOCK",
            "simulated": True,
            "flight": alternative.flight_number,
            "price": alternative.price,
        }