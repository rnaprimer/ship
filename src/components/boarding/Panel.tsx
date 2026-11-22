import type { ReactNode } from "react";

/** Retro card used by the boarding screens. */
export function BoardingPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0b2a3d] px-4 py-10">
      <div className="w-full max-w-md rounded-sm border-4 border-[#3b2414] bg-[#f4ead5] p-6 text-[#3b2414] shadow-[0_6px_0_#3b2414] sm:p-8">
        <h1 className="font-pixel mb-6 text-center text-base leading-relaxed sm:text-lg">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function PixelButton({ children, disabled, type = "submit" }: { children: ReactNode; disabled?: boolean; type?: "submit" | "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="font-pixel w-full rounded-sm border-4 border-[#3b2414] bg-[#e0b266] px-4 py-4 text-xs text-[#3b2414] shadow-[0_4px_0_#3b2414] enabled:active:translate-y-1 enabled:active:shadow-none disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-4 rounded-sm border-2 border-[#8e3b46] bg-[#f9dcd8] px-3 py-2 text-sm text-[#6b1f2a]">
      {children}
    </p>
  );
}
