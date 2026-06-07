import { SignJWT, jwtVerify } from "jose";

const key = (secret: string) => new TextEncoder().encode(secret);

export async function createSessionToken(secret: string): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    await jwtVerify(token, key(secret));
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = "licks_session";
