import { describe, expect, test } from "bun:test"
import {
  buildBookingPayloads,
  executionFailed,
  getSelectedRiskEvent,
  rankScenarios,
  validateBookingRows,
} from "./page"

describe("continuity workspace page contracts", () => {
  test("evaluates the explicitly selected risk event instead of the first event", () => {
    const events = [
      { id: 7, event_type: "STRIKE" },
      { id: 11, event_type: "WEATHER" },
    ]

    expect(getSelectedRiskEvent(events, 11)?.id).toBe(11)
    expect(getSelectedRiskEvent(events, null)).toBeUndefined()
  })

  test("ranks only actionable draft scenarios and excludes historical plans", () => {
    const ranked = rankScenarios([
      { id: 1, plan_code: "A", status: "EXECUTED", overall_score: 99 },
      { id: 2, plan_code: "B", status: "DRAFT", overall_score: 71 },
      { id: 3, plan_code: "C", status: "APPROVED", overall_score: 100 },
      { id: 4, plan_code: "D", status: "DRAFT", overall_score: 88 },
    ])

    expect(ranked.map((scenario) => scenario.plan_code)).toEqual(["D", "B"])
  })

  test("rejects invalid custom booking financial fields before submission", () => {
    const valid = { booking_type: "flight", provider: "Atlas", title: "Flight", location: "NRT", start_time: "20261001T0900", end_time: "20261001T1500", cost: "720", currency: "USD", cancel_deadline: "20260930T0900", change_deadline: "20260930T0900", refundable_pct: "50" }

    expect(validateBookingRows([{ ...valid, currency: "" }])).toMatch(/currency/i)
    expect(validateBookingRows([{ ...valid, currency: "ZZZ" }])).toMatch(/currency/i)
    expect(validateBookingRows([{ ...valid, cost: "-1" }])).toMatch(/cost/i)
    expect(validateBookingRows([{ ...valid, refundable_pct: "101" }])).toMatch(/refundable/i)
    expect(validateBookingRows([valid])).toBeNull()
  })

  test("treats empty execution results as a failed outcome", () => {
    expect(executionFailed([])).toBe(true)
  })

  test("ranks every scenario by highest overall score", () => {
    const ranked = rankScenarios([
      { id: 1, plan_code: "A", status: "DRAFT", overall_score: 71 },
      { id: 2, plan_code: "B", status: "DRAFT", overall_score: 88 },
      { id: 3, plan_code: "C", status: "DRAFT", overall_score: 80 },
    ])

    expect(ranked.map((scenario) => scenario.plan_code)).toEqual(["B", "C", "A"])
  })

  test("builds four non-empty booking payloads for a custom trip", () => {
    const rows = buildBookingPayloads([
      { booking_type: "flight", provider: "Atlas", title: "Flight", location: "NRT", start_time: "20261001T0900", end_time: "20261001T1500", cost: "720", currency: "USD", cancel_deadline: "20260930T0900", change_deadline: "20260930T0900", refundable_pct: "50" },
      { booking_type: "hotel", provider: "Hotel", title: "Stay", location: "Tokyo", start_time: "20261001T1600", end_time: "20261004T1000", cost: "600", currency: "USD", cancel_deadline: "20260930T1000", change_deadline: "20260930T1000", refundable_pct: "90" },
      { booking_type: "transport", provider: "Transfer", title: "Ride", location: "NRT", start_time: "20261001T1600", end_time: "20261001T1700", cost: "80", currency: "USD", cancel_deadline: "20260930T1000", change_deadline: "20260930T1000", refundable_pct: "100" },
      { booking_type: "activity", provider: "Tour", title: "Tour", location: "Tokyo", start_time: "20261002T1000", end_time: "20261002T1400", cost: "160", currency: "USD", cancel_deadline: "20261001T1000", change_deadline: "20261001T1000", refundable_pct: "70" },
    ])

    expect(rows).toHaveLength(4)
    expect(rows.every((row) => row.title && row.provider && row.start_time && row.end_time)).toBe(true)
    expect(rows[0].cost).toBe(720)
    expect(rows[3].refundable_pct).toBe(70)
  })

  test("treats failed execution results as a failed outcome", () => {
    expect(executionFailed([{ booking_id: 1, status: "FAILED" }])).toBe(true)
    expect(executionFailed([{ booking_id: 1, status: "ERROR" }])).toBe(true)
    expect(executionFailed([])).toBe(true)
  })
})
