import type { Metadata, Viewport } from "next";
import { Alegreya_Sans, Cinzel, Pixelify_Sans } from "next/font/google";
import { BoardingProvider } from "@/components/boarding/BoardingProvider";
import "./globals.css";

// Fonts (owner request 2026-11-24, "fonts you think look good"):
//   Cinzel         carved maritime serif for headings and the main buttons
//   Alegreya Sans  warm, readable humanist sans for body text
//   Pixelify Sans  pixel face for the in-game HUD and boarding cards
const headingFont = Cinzel({
  variable: "--font-cinzel",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const bodyFont = Alegreya_Sans({
  variable: "--font-alegreya-sans",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
});

const pixelFont = Pixelify_Sans({
  variable: "--font-pixelify",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Peekatribe", template: "%s · Peekatribe" },
  applicationName: "Peekatribe",
  appleWebApp: { title: "Peekatribe" },
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
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable} ${pixelFont.variable} h-full`}>
      <body className="font-display min-h-full">
        <BoardingProvider>{children}</BoardingProvider>
      </body>
    </html>
  );
}
