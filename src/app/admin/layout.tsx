import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin · The Internet Ship",
  robots: { index: false, follow: false },
};

/** Static shell; every page checks the Cloudflare Access token itself. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
          <span className="font-semibold">The Internet Ship · Admin</span>
          <Link href="/admin" className="text-slate-600 hover:text-slate-900">Overview</Link>
          <Link href="/admin/players" className="text-slate-600 hover:text-slate-900">Players</Link>
          <Link href="/admin/invites" className="text-slate-600 hover:text-slate-900">Invitations</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
