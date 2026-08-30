import { mock, describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
}))

const { default: Landing } = await import("./page")

describe("landing page", () => {
  test("contains only the Kru globe hero", () => {
    const html = renderToStaticMarkup(<Landing />)

    expect(html).toContain("Kru Is All You Need")
    expect(html).not.toContain("Your trip stays on track")
    expect(html).not.toContain("Trip Graph")
    expect(html).toContain("<canvas")
  })
})
