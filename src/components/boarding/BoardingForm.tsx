"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useBoarding } from "./BoardingProvider";
import { BoardingPanel, ErrorNote, PixelButton } from "./Panel";
import { errorFrom, GENERIC_ERROR } from "./messages";

/** Groups what the player types as XXXX-XXXX-XXXX-XXXX (display only; the server normalizes). */
function formatInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return clean.match(/.{1,4}/g)?.join("-") ?? "";
}

export function BoardingForm() {
  const router = useRouter();
  const { setCode } = useBoarding();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Returning players with a valid session skip boarding.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((res) => {
        if (!cancelled && res.ok) router.replace("/ship");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/boarding/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      if (res.ok) {
        setCode(value);
        router.push("/board/username");
        return;
      }
      setError((await errorFrom(res)).message);
    } catch {
      setError(GENERIC_ERROR);
    }
    setBusy(false);
  }

  return (
    <BoardingPanel title="Your Boarding Pass">
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="code" className="mb-2 block text-sm">
          Enter your unique boarding code
        </label>
        <input
          id="code"
          name="code"
          value={value}
          onChange={(e) => setValue(formatInput(e.target.value))}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={19}
          className="font-pixel mb-5 w-full rounded-sm border-4 border-[#3b2414] bg-white px-3 py-3 text-center text-sm tracking-wider outline-none focus:border-[#2f8f83]"
        />
        <PixelButton disabled={busy || value.replace(/-/g, "").length < 16}>{busy ? "Checking…" : "Continue"}</PixelButton>
        {error && <ErrorNote>{error}</ErrorNote>}
      </form>
      <p className="mt-6 text-center text-xs text-[#6e4627]">
        No code yet? Comment on our Instagram Reel and we&apos;ll DM you one.
      </p>
    </BoardingPanel>
  );
}
