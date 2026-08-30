import { mock, describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

const { default: Landing } = await import("./page")

describe("landing page", () => {
  test("renders Kru globe hero with entry to continuity workspace", () => {
    const html = renderToStaticMarkup(<Landing />)

    expect(html).toContain("Kru Is All You Need")
    expect(html).toContain("<canvas")
    expect(html).not.toContain("Your trip stays on track")
    expect(html).not.toContain("Trip Graph")
    expect(html).toContain("Open continuity workspace")
    expect(html).toContain('href="/app"')
    expect(html).toContain("Kru protects paid trips when disruption appears")
  })
})
