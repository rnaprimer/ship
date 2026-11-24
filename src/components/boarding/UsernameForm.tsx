"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBoarding } from "./BoardingProvider";
import { BoardingPanel, ErrorNote, PixelButton } from "./Panel";
import { CharacterPicker } from "./CharacterPicker";
import { CODE_ERRORS, errorFrom, GENERIC_ERROR } from "./messages";
import { checkUsername } from "@/lib/boarding/username";
import { CHARACTER_VARIANT_COUNT } from "@/game/types";

export function UsernameForm() {
  const router = useRouter();
  const { code, setCode } = useBoarding();
  const [username, setUsername] = useState("");
  const [variant, setVariant] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [codeProblem, setCodeProblem] = useState(false);
  const [busy, setBusy] = useState(false);

  // The code only lives in memory: after a reload, start again on the home page.
  useEffect(() => {
    if (!code) router.replace("/");
  }, [code, router]);

  // Random starting look, chosen on the client after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVariant(Math.floor(Math.random() * CHARACTER_VARIANT_COUNT));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !code) return;
    const local = checkUsername(username);
    if (!local.ok) {
      setError(local.reason);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/boarding/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, username: local.username, characterVariant: variant }),
      });
      if (res.ok) {
        setCode(null);
        router.replace("/ship");
        return;
      }
      const err = await errorFrom(res);
      setCodeProblem(CODE_ERRORS.has(err.code));
      setError(err.message);
    } catch {
      setError(GENERIC_ERROR);
    }
    setBusy(false);
  }

  if (!code) return null;

  return (
    <BoardingPanel title="What should we call you aboard the ship?">
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="username" className="mb-2 block text-sm">
          Username (3 to 20 letters, numbers or _)
        </label>
        <input
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
          placeholder="oceanwanderer"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          className="mb-5 w-full rounded-sm border-4 border-[#3b2414] bg-white px-3 py-3 text-base outline-none focus:border-[#2f8f83]"
        />
        <CharacterPicker value={variant} onChange={setVariant} />
        <PixelButton disabled={busy || username.length < 3}>{busy ? "Boarding…" : "Board the ship"}</PixelButton>
        {error && (
          <ErrorNote>
            {error}{" "}
            {codeProblem && (
              <Link href="/" className="underline">
                Enter a different code
              </Link>
            )}
          </ErrorNote>
        )}
      </form>
    </BoardingPanel>
  );
}
