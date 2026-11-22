import type { Metadata } from "next";
import { BoardingProvider } from "@/components/boarding/BoardingProvider";

export const metadata: Metadata = { title: "Board the ship · The Internet Ship" };

export default function BoardLayout({ children }: LayoutProps<"/board">) {
  return <BoardingProvider>{children}</BoardingProvider>;
}
