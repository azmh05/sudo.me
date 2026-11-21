import { SignJWT, jwtVerify } from "jose";

// This file must stay free of database code: it also runs in middleware.

export const SESSION_COOKIE = "hub_session";
export const SESSION_HOURS = 12;

export type Session = { userId: number; ver: number };

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. See .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session) {
  return new SignJWT({ ver: session.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const userId = Number(payload.sub);
    const ver = Number(payload.ver);
    if (!Number.isInteger(userId) || !Number.isInteger(ver)) return null;
    return { userId, ver };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: SESSION_HOURS * 60 * 60,
};
