import "server-only";
import { formatCode, generateCode, hashCode, normalizeCode } from "../boarding/code";
import { aesGcmDecryptHex, aesGcmEncryptHex } from "../security/crypto";
import { issueInvite, recordInviteDelivery } from "../db/rpc";
import { boardingUrl, secrets, serverEnv } from "../env";
import type { DeliveryStatusRequest, IssueRequest, IssueResponse } from "./contract";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Issues (or re-returns) the boarding code for an Instagram comment. All
 * dedup rules live in the issue_invite database function; this only creates
 * the candidate code and decrypts a stored one when the function returns an
 * existing invite. The plaintext exists only in memory and in the response.
 */
export async function issueForComment(req: IssueRequest): Promise<IssueResponse> {
  const { pepper, encryptionKey } = secrets();
  const code = generateCode();
  const result = await issueInvite({
    shipId: serverEnv().SHIP_ID,
    instagramAccountId: req.instagram_account_id,
    instagramUserId: req.instagram_user_id,
    instagramCommentId: req.instagram_comment_id,
    instagramMediaId: req.instagram_media_id,
    codeHash: await hashCode(code, pepper),
    codeCiphertext: await aesGcmEncryptHex(encryptionKey, code),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  if (result.status === "issued" || result.status === "existing" || result.status === "active_elsewhere") {
    let plain = code;
    if (result.status !== "issued") {
      if (!result.code_ciphertext) throw new Error("issue_invite returned no ciphertext");
      const decrypted = normalizeCode(await aesGcmDecryptHex(encryptionKey, result.code_ciphertext));
      if (!decrypted) throw new Error("stored code failed to decrypt");
      plain = decrypted;
    }
    return {
      status: result.status,
      invitation_id: result.invitation_id!,
      boarding_code: formatCode(plain),
      expires_at: new Date(result.expires_at!).toISOString(),
      ship_url: boardingUrl(),
    };
  }
  return { status: result.status };
}

export async function recordDelivery(req: DeliveryStatusRequest): Promise<boolean> {
  return recordInviteDelivery(serverEnv().SHIP_ID, req.invitation_id, req.outcome);
}
