import Link from "next/link";

/** Placeholder landing page. The real one (animated ship, passenger count) is Milestone 5. */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#0b2a3d] px-4 text-center text-[#f4ead5]">
      <h1 className="font-pixel text-xl leading-relaxed sm:text-3xl">The Internet Ship</h1>
      <p className="max-w-sm text-sm text-[#b9d3dc]">Milestone 1 prototype. Walk around the ship.</p>
      <Link
        href="/ship"
        className="font-pixel rounded-sm border-4 border-[#3b2414] bg-[#e0b266] px-6 py-4 text-xs text-[#3b2414] shadow-[0_4px_0_#3b2414] active:translate-y-1 active:shadow-none"
      >
        Go aboard
      </Link>
    </main>
  );
}
