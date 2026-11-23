import type { ReactNode } from "react";

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function fmtDate(iso: string | null | undefined): string {
  return iso ? `${dateFmt.format(new Date(iso))} UTC` : "—";
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

export function Stat({ label, value, warn = false }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${warn ? "text-red-700" : "text-slate-900"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "red" | "amber" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function statusTone(status: string): "slate" | "green" | "red" | "amber" | "blue" {
  if (["active", "delivered", "redeemed"].includes(status)) return "green";
  if (["failed", "revoked", "disabled"].includes(status)) return "red";
  if (["unconfirmed", "expired", "paused"].includes(status)) return "amber";
  return "slate";
}

export function Loading() {
  return <p className="text-sm text-slate-500">Loading…</p>;
}
