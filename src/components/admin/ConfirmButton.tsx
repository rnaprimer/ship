"use client";

import type { ReactNode } from "react";

/** Submit button that asks for confirmation before a destructive admin action. */
export function ConfirmButton({ message, children, tone = "danger" }: { message: string; children: ReactNode; tone?: "danger" | "neutral" }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={`rounded border px-2.5 py-1 text-xs font-medium ${
        tone === "danger"
          ? "border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
