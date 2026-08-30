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
  test("renders directed dependencies from node boundaries and exposes a text summary", () => {
    const html = renderToStaticMarkup(<TripGraph graph={graph} />)

    expect(html).toContain("Trip dependency graph")
    expect(html).toContain("Flight to Tokyo")
    expect(html).toContain("Hotel in Tokyo")
    expect(html).toContain("precedes")
    expect(html).toContain('marker-end="url(#trip-graph-arrow)"')
    expect(html).toContain('x1="290" y1="62" x2="350" y2="62"')
    expect(html).not.toContain('x1="155" y1="62" x2="485" y2="62"')
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-describedby="trip-graph-description-42"')
    expect(html).toContain("Directed dependencies: Flight to Tokyo precedes Hotel in Tokyo.")
  })

  test("marks affected nodes with text as well as visual styling", () => {
    const html = renderToStaticMarkup(<TripGraph graph={graph} affectedBookingIds={[11]} />)

    expect(html).toContain("Affected")
    expect(html).toContain('aria-label="Hotel in Tokyo, hotel, CONFIRMED, affected"')
  })

  test("surfaces dependencies whose endpoints are missing", () => {
    const html = renderToStaticMarkup(
      <TripGraph graph={{ ...graph, edges: [{ source: 10, target: 99, relation_type: "precedes" }] }} />,
    )

    expect(html).toContain("Some dependencies could not be displayed")
    expect(html).toContain("Booking 99")
  })

  test("truncates long node titles without losing their accessible label", () => {
    const title = "Very long booking title for Tokyo airport connection"
    const html = renderToStaticMarkup(
      <TripGraph graph={{ ...graph, nodes: [{ ...graph.nodes[0], title }] }} />,
    )

    expect(html).toContain(">Very long booking title for Tok…</text>")
    expect(html).toContain(`aria-label="${title}, flight, CONFIRMED"`)
  })

  test("renders an empty state when graph data is unavailable", () => {
    const html = renderToStaticMarkup(<TripGraph graph={null} />)

    expect(html).toContain("No trip dependency data available")
    expect(html).not.toContain("trip-graph-arrow")
  })
})
