"use client";

import { useBoardingCode } from "@/components/boarding/useBoardingCode";

/** The boarding-pass form on the home page. */
export function HomeBoarding() {
  const { value, setValue, error, busy, complete, submit } = useBoardingCode();

  return (
    <form onSubmit={submit} noValidate className="font-display flex w-full max-w-sm flex-col items-center gap-4 lg:items-start">
      <label htmlFor="home-code" className="sr-only">
        Your boarding pass code
      </label>
      <input
        id="home-code"
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
        aria-describedby="home-code-help"
        aria-invalid={error ? true : undefined}
        className="w-full rounded-full border-2 border-[#3b2414]/70 bg-white/95 px-6 py-3.5 text-center text-xl font-medium tracking-[0.14em] text-[#2a1a12] shadow-[0_3px_0_rgba(59,36,20,0.35)] outline-none placeholder:text-[#2a1a12]/35 focus:border-[#3b2414] focus:ring-4 focus:ring-white/60"
      />
      <button
        type="submit"
        disabled={busy || !complete}
        className="font-heading rounded-full border-2 border-[#3b2414]/70 bg-[#e0b266] px-9 py-3 text-xl font-bold tracking-wide text-[#3b2414] shadow-[0_3px_0_rgba(59,36,20,0.45)] transition-transform enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? "Checking…" : "Board the ship"}
      </button>
      {error && (
        <p role="alert" className="w-full rounded-xl bg-white/90 px-4 py-2.5 text-center text-sm font-medium text-[#8a1c12] lg:text-left">
          {error}
        </p>
      )}
      <p id="home-code-help" className="max-w-xs text-center text-base leading-snug text-[#0b3a47] lg:text-left">
        Enter the boarding pass we sent you by DM. Already aboard? The same pass takes you back to your character on any
        device.
      </p>
    </form>
  );
}
