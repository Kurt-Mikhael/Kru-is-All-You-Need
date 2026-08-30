import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { GlobeDemo } from "./globe-demo"

describe("GlobeDemo", () => {
  test("renders Kru title and an interactive canvas", () => {
    const html = renderToStaticMarkup(<GlobeDemo />)

    expect(html).toContain("Kru Is All You Need")
    expect(html).toContain("<canvas")
    expect(html).not.toContain(">Globe<")
  })
})
