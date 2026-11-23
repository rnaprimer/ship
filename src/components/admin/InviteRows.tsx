import type { AdminInvite } from "@/lib/db/rpc";
import { revokeInvite } from "@/app/admin/actions";
import { Badge, fmtDate, statusTone } from "./ui";
import { ConfirmButton as ConfirmButtonForm } from "./ConfirmButton";

/** Invitation table for the admin panel. Never shows Instagram identifiers. */
export function InviteRows({ rows }: { rows: AdminInvite[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            <th className="py-1 pr-3 font-medium">Invitation</th>
            <th className="py-1 pr-3 font-medium">Status</th>
            <th className="py-1 pr-3 font-medium">DM delivery</th>
            <th className="py-1 pr-3 font-medium">Issued</th>
            <th className="py-1 pr-3 font-medium">Expires</th>
            <th className="py-1 pr-3 font-medium">Boarded as</th>
            <th className="py-1 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="py-1.5 pr-3 font-mono text-xs" title={r.id}>{r.id.slice(0, 8)}</td>
              <td className="py-1.5 pr-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
              <td className="py-1.5 pr-3">
                <Badge tone={statusTone(r.delivery_status)}>{r.delivery_status}</Badge>
                <span className="ml-1 text-xs text-slate-500">×{r.delivery_attempts}</span>
              </td>
              <td className="py-1.5 pr-3 text-xs text-slate-600">{fmtDate(r.created_at)}</td>
              <td className="py-1.5 pr-3 text-xs text-slate-600">{fmtDate(r.expires_at)}</td>
              <td className="py-1.5 pr-3">{r.username ?? "—"}</td>
              <td className="py-1.5 text-right">
                {r.status === "active" && (
                  <form action={revokeInvite}>
                    <input type="hidden" name="invitationId" value={r.id} />
                    <ConfirmButtonForm message="Revoke this invitation? Its code will stop working and can't be re-sent.">
                      Revoke
                    </ConfirmButtonForm>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
