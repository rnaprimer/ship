"use client";

import { BoardingPanel, ErrorNote, PixelButton } from "./Panel";
import { useBoardingCode } from "./useBoardingCode";

/** The /board page (linked from older DMs): same flow as the home page form. */
export function BoardingForm() {
  const { value, setValue, error, busy, complete, submit } = useBoardingCode();

  return (
    <BoardingPanel title="Your Boarding Pass">
      <form onSubmit={submit} noValidate>
        <label htmlFor="code" className="mb-2 block text-sm">
          Enter your unique boarding code
        </label>
        <input
          id="code"
          name="code"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={19}
          className="font-pixel mb-5 w-full rounded-sm border-4 border-[#3b2414] bg-white px-3 py-3 text-center text-sm tracking-wider outline-none focus:border-[#2f8f83]"
        />
        <PixelButton disabled={busy || !complete}>{busy ? "Checking…" : "Continue"}</PixelButton>
        {error && <ErrorNote>{error}</ErrorNote>}
      </form>
      <p className="mt-6 text-center text-xs text-[#6e4627]">
        Already aboard? Enter the same boarding pass to get back to your character on any device.
        <br />
        No code yet? Comment on our Instagram Reel and we&apos;ll DM you one.
      </p>
    </BoardingPanel>
  );
}
