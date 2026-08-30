"use client";
import React from "react";

export function Badge({ state }: { state: string }) {
  const s = (state || "MONITOR").toUpperCase();
  return (
    <span className={`badge badge-${s}`}>
      <i style={{ background: s === "MONITOR" ? "var(--success)" : s === "ELEVATED" ? "var(--warning)" : "var(--danger)" }} />
      {s}
    </span>
  );
}

export function Skeleton({ h = 14, w = "100%", r = 8 }: { h?: number; w?: string | number; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

export function Card({ children, className = "", ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...p}>
      {children}
    </div>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: 16, flex: "1 1 160px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
export { ExposureCards, type FinancialExposure } from "./ui/exposure-cards";
export { TripGraph, type GraphEdge, type GraphNode, type TripGraphData } from "./ui/trip-graph";
