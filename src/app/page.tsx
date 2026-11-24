import Image from "next/image";
import { PassengerCount } from "@/components/landing/PassengerCount";
import { HomeBoarding } from "@/components/landing/HomeBoarding";

/**
 * Home page: the Peekatribe logo and ship on a bright sky, the live passenger
 * count, and the boarding-pass form. New passengers go on to pick a name;
 * returning ones go straight to the ship.
 *
 * The logo and ship are /brand/logo.png and /brand/ship.png (transparent PNGs).
 */
export default function Home() {
  return (
    <main className="home-sky font-display relative flex min-h-dvh flex-col overflow-hidden px-4 pb-10 pt-[calc(env(safe-area-inset-top)+20px)] sm:px-8 lg:px-14">
      <div className="flex justify-end">
        <PassengerCount variant="home" />
      </div>

      {/* Phones: logo, ship, form. Desktop: logo and form on the left, the ship on the right. */}
      <div className="mx-auto grid w-full max-w-7xl flex-1 content-center items-center gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:grid-rows-[auto_auto] lg:gap-x-10 lg:gap-y-20">
        <h1 className="mx-auto w-full max-w-[480px] lg:col-start-1 lg:row-start-1 lg:mx-0 lg:self-end">
          <Image
            src="/brand/logo.png"
            alt="Peekatribe"
            width={545}
            height={260}
            priority
            sizes="(min-width: 1024px) 480px, 90vw"
            className="h-auto w-full select-none"
            draggable={false}
          />
        </h1>

        <div className="relative -mx-4 sm:mx-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Image
            src="/brand/ship.png"
            alt="A black-sailed pirate ship, lanterns lit, cutting through the waves"
            width={745}
            height={590}
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="home-ship mx-auto h-auto w-full max-w-[780px] select-none"
            draggable={false}
          />
        </div>

        <div className="flex justify-center lg:col-start-1 lg:row-start-2 lg:justify-start lg:self-start lg:pl-24">
          <HomeBoarding />
        </div>
      </div>

      <footer className="mt-6 flex justify-center lg:justify-start">
        <a
          href="https://www.instagram.com/peekatribe/"
          className="text-sm font-medium text-[#0b3a47] underline underline-offset-4"
          rel="noopener noreferrer"
          target="_blank"
        >
          No boarding pass yet? Comment on our Reel @peekatribe
        </a>
      </footer>
    </main>
  );
}
