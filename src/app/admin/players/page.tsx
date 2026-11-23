import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/session";
import { adminSearchPlayers } from "@/lib/db/rpc";
import { serverEnv } from "@/lib/env";
import { setPlayerStatus } from "../actions";
import { Badge, Card, ConfirmButtonForm, Loading, fmtDate, statusTone } from "../parts";

export default function PlayersPage({ searchParams }: PageProps<"/admin/players">) {
  return (
    <Suspense fallback={<Loading />}>
      <Players searchParams={searchParams} />
    </Suspense>
  );
}

async function Players({ searchParams }: { searchParams: PageProps<"/admin/players">["searchParams"] }) {
  await requireAdmin();
  const q = String((await searchParams).q ?? "").slice(0, 40);
  const players = await adminSearchPlayers(serverEnv().SHIP_ID, q, 200);

  return (
    <Card title="Players">
      <form method="get" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search usernames"
          className="w-full max-w-xs rounded border border-slate-300 px-3 py-1.5 text-sm"
          autoComplete="off"
        />
        <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">Search</button>
      </form>
      {players.length === 0 ? (
        <p className="text-sm text-slate-500">No players{q ? ` matching “${q}”` : " yet"}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-1 pr-3 font-medium">Username</th>
                <th className="py-1 pr-3 font-medium">Status</th>
                <th className="py-1 pr-3 font-medium">Look</th>
                <th className="py-1 pr-3 font-medium">Joined</th>
                <th className="py-1 pr-3 font-medium">Last seen</th>
                <th className="py-1 font-medium" />
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3 font-medium">{p.username}</td>
                  <td className="py-1.5 pr-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                  <td className="py-1.5 pr-3 text-xs text-slate-600">{p.character_variant + 1}</td>
                  <td className="py-1.5 pr-3 text-xs text-slate-600">{fmtDate(p.joined_at)}</td>
                  <td className="py-1.5 pr-3 text-xs text-slate-600">{fmtDate(p.last_seen_at)}</td>
                  <td className="py-1.5 text-right">
                    <form action={setPlayerStatus}>
                      <input type="hidden" name="playerId" value={p.id} />
                      <input type="hidden" name="status" value={p.status === "active" ? "disabled" : "active"} />
                      {p.status === "active" ? (
                        <ConfirmButtonForm message={`Disable ${p.username}? They are signed out at once and hidden from other passengers.`}>
                          Disable
                        </ConfirmButtonForm>
                      ) : (
                        <ConfirmButtonForm tone="neutral" message={`Re-enable ${p.username}? Their name shows on the ship again. Their old sign-in stays cancelled, so they can't get back in until account recovery exists.`}>
                          Re-enable
                        </ConfirmButtonForm>
                      )}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">Newest first, up to 200. Disabling signs the player out and hides their name from the ship.</p>
    </Card>
  );
}
