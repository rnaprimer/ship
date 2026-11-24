import type { Metadata, Viewport } from "next";
import { Lexend, Press_Start_2P } from "next/font/google";
import { BoardingProvider } from "@/components/boarding/BoardingProvider";
import "./globals.css";

const pixelFont = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

// The home page and the ship map: bold, rounded sans to match the brand art.
const displayFont = Lexend({
  variable: "--font-lexend",
  weight: ["500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Internet Ship",
  description: "Comment on our Reel, get a boarding pass, and walk around a pixel-art ship.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b2a3d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${displayFont.variable} h-full`}>
      <body className="min-h-full">
        <BoardingProvider>{children}</BoardingProvider>
      </body>
    </html>
  );
}
