import { createHash, randomBytes } from "node:crypto";

// Private host links use a random 32-byte token. Only its SHA-256 hash is stored
// (events.host_edit_token_hash), so the raw token exists only in the host's email.
export function generateHostToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashHostToken(token) };
}

export function hashHostToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
