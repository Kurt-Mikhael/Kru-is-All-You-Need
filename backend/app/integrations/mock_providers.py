def execute(booking: dict, action: str, new_time: str = "") -> dict:
    return {
        "provider": "MOCK",
        "simulated": True,
        "booking_id": booking["id"],
        "booking_type": booking["booking_type"],
        "action": action,
        "new_time": new_time,
    }


def hotel_reschedule(booking: dict, new_check_in: str) -> dict:
    return execute(booking, "RESCHEDULE", new_check_in)


def transport_reschedule(booking: dict, new_time: str) -> dict:
    return execute(booking, "RESCHEDULE", new_time)


def activity_reschedule(booking: dict, new_time: str) -> dict:
    return execute(booking, "RESCHEDULE", new_time)