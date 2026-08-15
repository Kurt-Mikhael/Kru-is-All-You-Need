import httpx

from ...config import ATLAS_BASE_URL, ATLAS_CLIENT_KEY, ATLAS_SECRET_KEY

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Accept-Encoding": "gzip",
    "x-atlas-client-id": ATLAS_CLIENT_KEY,
    "x-atlas-client-secret": ATLAS_SECRET_KEY,
}


def _post(endpoint: str, payload: dict) -> dict:
    url = f"{ATLAS_BASE_URL}{endpoint}"
    resp = httpx.post(url, json=payload, headers=HEADERS, timeout=30.0)
    resp.raise_for_status()
    return resp.json()


def search_flights(origin: str, destination: str, dep_date: str, passengers: int = 1, currency: str = "USD") -> dict:
    if "-" in dep_date:
        dep_date = dep_date.replace("-", "")
    payload = {
        "tripType": 1,
        "fromCity": origin,
        "toCity": destination,
        "fromDate": dep_date,
        "retDate": "",
        "adultNum": passengers,
        "childNum": 0,
        "infantNum": 0,
        "currency": currency,
    }
    return _post("search.do", payload)


def verify_flight(routing_identifier: str) -> dict:
    return _post("verify.do", {"routingIdentifier": routing_identifier, "maxResponseTime": 15000})


def create_order(session_id: str, passengers: list[dict], contact: dict) -> dict:
    payload = {
        "sessionId": session_id,
        "passengers": passengers,
        "contact": contact,
        "useAtlasMailForContact": False,
    }
    return _post("order.do", payload)


def pay_order(order_no: str, payment_method: int = 1, credit_card: dict | None = None) -> dict:
    payload: dict = {"orderNo": order_no, "paymentMethod": payment_method}
    if credit_card:
        payload["creditCard"] = credit_card
    return _post("pay.do", payload)


def query_order(order_no: str) -> dict:
    return _post("queryOrderDetails.do", {"orderNo": order_no})