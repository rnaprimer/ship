import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { adminListInvites, adminOverview, adminRecentAudit } from "@/lib/db/rpc";
import { serverEnv } from "@/lib/env";
import { setBoardingStatus } from "./actions";
import { InviteRows } from "@/components/admin/InviteRows";
import { Badge, Card, ConfirmButtonForm, Loading, Stat, fmtDate } from "./parts";

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const admin = await requireAdmin();
  const shipId = serverEnv().SHIP_ID;
  const [o, problems, audit] = await Promise.all([
    adminOverview(shipId),
    adminListInvites(shipId, "delivery_problems", 10),
    adminRecentAudit(shipId, 15),
  ]);
  const paused = o.ship_status === "paused";

  return (
    <div className="grid gap-4">
      <p className="text-xs text-slate-500">Signed in as {admin.email} via Cloudflare Access.</p>

      <Card title="Boarding">
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone={paused ? "amber" : "green"}>{paused ? "Paused" : "Open"}</Badge>
          <p className="text-sm text-slate-600">
            {paused
              ? "No new codes are issued and no codes can be redeemed. Players already aboard can still walk around."
              : "Comments get boarding codes and codes can be redeemed."}
          </p>
          <form action={setBoardingStatus} className="ml-auto">
            <input type="hidden" name="status" value={paused ? "active" : "paused"} />
            <ConfirmButtonForm
              message={paused ? "Resume boarding?" : "Pause boarding? New comments will not get codes and nobody can redeem until you resume."}
              tone={paused ? "neutral" : "danger"}
            >
              {paused ? "Resume boarding" : "Pause boarding"}
            </ConfirmButtonForm>
          </form>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Players">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="aboard" value={o.players_active} />
            <Stat label="disabled" value={o.players_disabled} />
          </div>
        </Card>
        <Card title="Invitations">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="active (unused)" value={o.invites_active} />
            <Stat label="redeemed" value={o.invites_redeemed} />
            <Stat label="expired" value={o.invites_expired} />
            <Stat label="revoked" value={o.invites_revoked} />
          </div>
        </Card>
        <Card title="DM delivery">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="failed" value={o.delivery_failed} warn={o.delivery_failed > 0} />
            <Stat label="unconfirmed" value={o.delivery_unconfirmed} warn={o.delivery_unconfirmed > 0} />
            <Stat label="pending" value={o.delivery_pending} />
          </div>
        </Card>
      </div>

      <Card title="Delivery problems (latest 10)">
        {problems.length === 0 ? (
          <p className="text-sm text-slate-500">None. Every reported DM was delivered.</p>
        ) : (
          <InviteRows rows={problems} />
        )}
        <p className="mt-3 text-xs text-slate-500">
          A failed or unconfirmed DM means the commenter may not have their code. Instagram identifiers are never shown here.{" "}
          <Link className="underline" href="/admin/invites?filter=delivery_problems">See all</Link>
        </p>
      </Card>

      <Card title="Recent admin actions">
        {audit.length === 0 ? (
          <p className="text-sm text-slate-500">No admin actions yet.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {audit.map((a, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 text-slate-700">
                <span className="text-slate-500">{fmtDate(a.created_at)}</span>
                <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                {a.target && <span className="truncate">{a.target}</span>}
                <span className="text-slate-500">by {a.actor_email}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
