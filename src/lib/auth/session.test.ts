// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const secret = "test-secret-at-least-32-bytes-long-xxxxx";

describe("session token", () => {
  it("round-trips a valid token", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token, secret)).toBe(true);
  });
  it("rejects a tampered token", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token + "x", secret)).toBe(false);
  });
  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken(secret);
    expect(await verifySessionToken(token, "another-secret-32-bytes-xxxxxxxxxxx")).toBe(false);
  });
});
