import Link from "next/link";
import { PassengerCount } from "@/components/landing/PassengerCount";

const HERO_W = 704;
const HERO_H = 416;

/**
 * Landing page (BRIEF §3 Stage B): the ship on an animated ocean, retro type,
 * the live passenger count and the boarding call to action. Static shell; the
 * count loads client-side from /api/ship.
 */
export default function Home() {
  return (
    <main className="landing-ocean relative flex min-h-dvh flex-col items-center overflow-hidden px-4 pb-10 pt-[calc(env(safe-area-inset-top)+40px)] text-[#f4ead5]">
      <header className="relative z-10 flex max-w-xl flex-col items-center gap-4 text-center">
        <h1 className="font-pixel text-2xl leading-relaxed [text-shadow:0_3px_0_#0b2a3d] sm:text-4xl">
          The Internet Ship
        </h1>
        <p className="max-w-md rounded-sm bg-[#0b2a3d]/70 px-4 py-3 text-sm leading-relaxed text-[#e6f2f6] sm:text-base">
          Comment on our Reel, get your boarding pass by DM, pick a name, and walk the deck with everyone
          who came aboard.
        </p>
      </header>

      <div className="landing-stage relative z-0 my-8 w-full" style={{ height: HERO_H }}>
        <div className="landing-pan absolute left-1/2 top-0" style={{ width: HERO_W, height: HERO_H }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled */}
          <img
            src="/game/ship-hero.png"
            width={HERO_W}
            height={HERO_H}
            alt="A pixel-art ship with passengers on deck, a gangway and a small pier"
            className="landing-bob block select-none [image-rendering:pixelated]"
            draggable={false}
          />
        </div>
      </div>

      <section className="relative z-10 flex flex-col items-center gap-6">
        <PassengerCount />
        <Link
          href="/board"
          className="font-pixel rounded-sm border-4 border-[#3b2414] bg-[#e0b266] px-7 py-4 text-sm text-[#3b2414] shadow-[0_5px_0_#3b2414] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
        >
          Board the ship
        </Link>
        <a
          href="https://www.instagram.com/peekatribe/"
          className="rounded-sm bg-[#0b2a3d]/70 px-3 py-1.5 text-xs text-[#e6f2f6] underline underline-offset-4"
          rel="noopener noreferrer"
          target="_blank"
        >
          @peekatribe on Instagram
        </a>
      </section>
    </main>
  );
}
