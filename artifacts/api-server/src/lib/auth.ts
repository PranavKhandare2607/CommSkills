import { randomBytes, createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { db, users, sessions, eq, and, gt, isNull } from "@workspace/db";

const SESSION_COOKIE_NAME = "commskills_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const hash = scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, "hex");
    return timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt,
  });
  return token;
}

export async function getSessionUser(token: string): Promise<{ id: number; email: string } | null> {
  const tokenHash = sha256(token);
  const row = await db
    .select({ id: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(
      eq(sessions.tokenHash, tokenHash),
      gt(sessions.expiresAt, new Date()),
      isNull(sessions.revokedAt),
    ))
    .limit(1);
  return row[0] ?? null;
}

export async function revokeSession(token: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, sha256(token)));
}

export function getSessionTokenFromCookie(cookies: string | undefined): string | null {
  if (!cookies) return null;
  const match = cookies.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookie(res: any, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: any): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export { SESSION_COOKIE_NAME };