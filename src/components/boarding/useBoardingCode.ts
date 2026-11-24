"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useBoarding } from "./BoardingProvider";
import { errorFrom, GENERIC_ERROR } from "./messages";

/** Groups what the player types as XXXX-XXXX-XXXX-XXXX (display only; the server normalizes). */
export function formatCodeInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return clean.match(/.{1,4}/g)?.join("-") ?? "";
}

/**
 * The boarding-pass step, shared by the home page and /board:
 *   - a new code is validated (not consumed) and the player picks a name next;
 *   - a code that already boarded signs its player back in (owner decision 2026-11-23);
 *   - a player with a live session skips straight to the ship.
 * The code stays in memory only (BoardingProvider), never in storage or a URL.
 */
export function useBoardingCode() {
  const router = useRouter();
  const { setCode } = useBoarding();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function submit(e: FormEvent) {
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
      const err = await errorFrom(res);
      // A code that already boarded is this player's key: sign them back in.
      if (err.code === "REDEEMED") {
        const back = await fetch("/api/boarding/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: value }),
        });
        if (back.ok) {
          router.replace("/ship");
          return;
        }
        setError((await errorFrom(back)).message);
      } else {
        setError(err.message);
      }
    } catch {
      setError(GENERIC_ERROR);
    }
    setBusy(false);
  }

  return {
    value,
    setValue: (raw: string) => setValue(formatCodeInput(raw)),
    error,
    busy,
    complete: value.replace(/-/g, "").length === 16,
    submit,
  };
}
