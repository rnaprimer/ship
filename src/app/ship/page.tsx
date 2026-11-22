import type { Metadata } from "next";
import { ShipExperience } from "@/components/ShipExperience";

export const metadata: Metadata = {
  title: "The Internet Ship",
};

export default function ShipPage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b2a3d] touch-none select-none">
      <ShipExperience />
    </main>
  );
}
