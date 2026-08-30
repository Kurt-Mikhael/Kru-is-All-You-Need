export const API = "/api";

export async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let message = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === "object" && "detail" in parsed) {
        const detail = parsed.detail;
        message = typeof detail === "string" ? detail : (JSON.stringify(detail) ?? String(detail));
      }
    } catch {
      // Keep the raw response when it is not JSON.
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json") ? res.json() : res.text();
}

export const fmtTime = (t: string) => {
  if (!t) return "-";
  const compact = t.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]} ${compact[4]}:${compact[5]}`;
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (iso) return `${iso[1]} ${iso[2]}`;
  return t;
};

export const money = (v: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(v || 0));
