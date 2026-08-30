import { afterEach, describe, expect, mock, test } from "bun:test"
import { api, fmtTime, money } from "./api"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  mock.restore()
})

describe("api errors", () => {
  test("uses FastAPI detail text when a request fails", async () => {
    globalThis.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({ detail: "Trip not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    })))

    try {
      await api("/trips/42")
      throw new Error("expected request to fail")
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe("Trip not found")
    }
  })
})

describe("fmtTime", () => {
  test("formats compact backend timestamps", () => {
    expect(fmtTime("20260830T1430")).toBe("2026-08-30 14:30")
  })

  test("formats ISO timestamps without malformed separators", () => {
    expect(fmtTime("2026-08-30T14:30:00Z")).toBe("2026-08-30 14:30")
  })
})

describe("money", () => {
  test("formats non-USD currencies with their currency symbol", () => {
    expect(money(1234, "EUR")).toBe("€1,234")
  })
})
