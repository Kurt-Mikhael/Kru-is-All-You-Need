export const API = "/api";
export async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json") ? res.json() : res.text();
}
export const fmtTime = (t: string) => {
  if (!t) return "-";
  // support YYYYMMDDTHHMM and YYYY-MM-DD
  if (t.includes("T")) {
    const d = t.replace("T", " ");
    return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8) + " " + d.slice(9, 11) + ":" + d.slice(11, 13);
  }
  return t;
};
export const money = (v: number) => "$" + Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
