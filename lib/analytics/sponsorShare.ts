import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ENCRYPTION_CONTEXT = "batchlogg:sponsor-analytics-link:v1";

function getEncryptionKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to protect sponsor links");
  }
  return createHash("sha256")
    .update(ENCRYPTION_CONTEXT)
    .update(serviceRoleKey)
    .digest();
}

export function encryptSponsorToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid sponsor token");

  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [nonce, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSponsorToken(value: string) {
  const [nonceText, tagText, encryptedText, extra] = value.split(".");
  if (!nonceText || !tagText || !encryptedText || extra !== undefined) {
    throw new Error("Invalid encrypted sponsor token");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(nonceText, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const token = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid decrypted sponsor token");
  return token;
}

export async function isSponsorAnalyticsTokenValid(
  serviceRole: SupabaseClient,
  token: string
) {
  if (!TOKEN_PATTERN.test(token)) return false;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await serviceRole
    .from("sponsor_analytics_links")
    .select("id")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) {
    console.error("Could not validate sponsor analytics link", error);
    throw new Error("Could not validate sponsor analytics link");
  }

  return Boolean(data);
}
