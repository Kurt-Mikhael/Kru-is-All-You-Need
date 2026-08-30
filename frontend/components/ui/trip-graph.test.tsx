import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { TripGraph, type TripGraphData } from "./trip-graph"

const graph: TripGraphData = {
  trip_id: 42,
  nodes: [
    { id: 10, title: "Flight to Tokyo", booking_type: "flight", start_time: "2026-09-01T08:00", status: "CONFIRMED" },
    { id: 11, title: "Hotel in Tokyo", booking_type: "hotel", start_time: "2026-09-01T15:00", status: "CONFIRMED" },
  ],
  edges: [{ source: 10, target: 11, relation_type: "precedes" }],
}

describe("TripGraph", () => {
  test("renders directed dependencies and readable node details", () => {
    const html = renderToStaticMarkup(<TripGraph graph={graph} />)

    expect(html).toContain("Trip dependency graph")
    expect(html).toContain("Flight to Tokyo")
    expect(html).toContain("Hotel in Tokyo")
    expect(html).toContain("precedes")
    expect(html).toContain('marker-end="url(#trip-graph-arrow)"')
    expect(html).toContain('role="img"')
  })

  test("marks affected nodes with text as well as visual styling", () => {
    const html = renderToStaticMarkup(<TripGraph graph={graph} affectedBookingIds={[11]} />)

    expect(html).toContain("Affected")
    expect(html).toContain('aria-label="Hotel in Tokyo, hotel, CONFIRMED, affected"')
  })

  test("renders an empty state when graph data is unavailable", () => {
    const html = renderToStaticMarkup(<TripGraph graph={null} />)

    expect(html).toContain("No trip dependency data available")
    expect(html).not.toContain("trip-graph-arrow")
  })
})
