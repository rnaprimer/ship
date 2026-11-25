import type { Metadata } from "next";

export const metadata: Metadata = { title: "Board the ship" };

/** The boarding code is held by the BoardingProvider in the root layout, shared with the home page. */
export default function BoardLayout({ children }: LayoutProps<"/board">) {
  return children;
}
