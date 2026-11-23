import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { adminListInvites, INVITE_FILTERS, type InviteFilter } from "@/lib/db/rpc";
import { serverEnv } from "@/lib/env";
import { Card, Loading } from "../parts";
import { InviteRows } from "@/components/admin/InviteRows";

const LABELS: Record<InviteFilter, string> = {
  all: "All",
  active: "Active",
  redeemed: "Redeemed",
  expired: "Expired",
  revoked: "Revoked",
  delivery_problems: "Delivery problems",
};

export default function InvitesPage({ searchParams }: PageProps<"/admin/invites">) {
  return (
    <Suspense fallback={<Loading />}>
      <Invites searchParams={searchParams} />
    </Suspense>
  );
}

async function Invites({ searchParams }: { searchParams: PageProps<"/admin/invites">["searchParams"] }) {
  await requireAdmin();
  const raw = (await searchParams).filter;
  const filter: InviteFilter = (INVITE_FILTERS as readonly string[]).includes(String(raw)) ? (raw as InviteFilter) : "all";
  const rows = await adminListInvites(serverEnv().SHIP_ID, filter, 200);

  return (
    <Card title="Invitations">
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {INVITE_FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/invites" : `/admin/invites?filter=${f}`}
            className={`rounded px-2 py-1 ${f === filter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {LABELS[f]}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <p className="text-sm text-slate-500">No invitations here.</p> : <InviteRows rows={rows} />}
      <p className="mt-3 text-xs text-slate-500">Newest first, up to 200. Revoking an active invitation makes its code unusable.</p>
    </Card>
  );
}
