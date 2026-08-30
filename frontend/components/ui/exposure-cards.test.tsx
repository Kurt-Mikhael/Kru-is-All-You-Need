import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { ExposureCards, type FinancialExposure } from "./exposure-cards"

const exposure: FinancialExposure = {
  total_value: 1250,
  refundable_value: 500,
  non_refundable_exposure: 750,
  becoming_non_refundable_soon: 300,
  potential_recovery_value: 275,
}

describe("ExposureCards", () => {
  test("renders every financial exposure value with its label", () => {
    const html = renderToStaticMarkup(<ExposureCards exposure={exposure} />)

    for (const label of [
      "Total value",
      "Refundable value",
      "Non-refundable exposure",
      "Becoming non-refundable soon",
      "Potential recovery value",
    ]) {
      expect(html).toContain(label)
    }
    expect(html).toContain("$1,250")
    expect(html).toContain("$750")
  })

  test("uses the supplied currency when formatting values", () => {
    const html = renderToStaticMarkup(<ExposureCards exposure={exposure} currency="IDR" />)

    expect(html).toContain("IDR 1,250")
    expect(html).not.toContain("$1,250")
  })

  test("renders a loading state when exposure data is unavailable", () => {
    const html = renderToStaticMarkup(<ExposureCards exposure={null} />)

    expect(html).toContain("Loading financial exposure")
    expect(html).toContain('role="status"')
  })
})
