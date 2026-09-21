import { describe, expect, it } from "vitest";

// EARLY_ACCESS_KEY is read once at module load, so it has to be set before
// the import below rather than per-test.
process.env.EARLY_ACCESS_KEY = "test-key-123";
const { checkEarlyAccessKey, isEarlyAccessEnabled, getEarlyAccessCookie } = await import("./earlyAccess.js");

function reqWithCookie(header?: string) {
  return { headers: { cookie: header } } as import("express").Request;
}

describe("checkEarlyAccessKey", () => {
  it("accepts the exact configured key", () => {
    expect(checkEarlyAccessKey("test-key-123")).toBe(true);
  });

  it("rejects a wrong key", () => {
    expect(checkEarlyAccessKey("wrong-key")).toBe(false);
  });

  it("rejects a key of a different length without throwing", () => {
    expect(checkEarlyAccessKey("test-key-123-but-longer")).toBe(false);
    expect(checkEarlyAccessKey("")).toBe(false);
  });

  it("reports the gate as enabled once a key is configured", () => {
    expect(isEarlyAccessEnabled()).toBe(true);
  });
});

describe("getEarlyAccessCookie", () => {
  it("returns null when there's no Cookie header at all", () => {
    expect(getEarlyAccessCookie(reqWithCookie(undefined))).toBeNull();
  });

  it("returns null when the cookie isn't present among others", () => {
    expect(getEarlyAccessCookie(reqWithCookie("connect.sid=abc; other=xyz"))).toBeNull();
  });

  it("finds the cookie among several others, in either position", () => {
    expect(getEarlyAccessCookie(reqWithCookie("connect.sid=abc; iez_ea=test-key-123; other=xyz"))).toBe(
      "test-key-123"
    );
    expect(getEarlyAccessCookie(reqWithCookie("iez_ea=test-key-123"))).toBe("test-key-123");
  });

  it("decodes a URL-encoded value", () => {
    expect(getEarlyAccessCookie(reqWithCookie("iez_ea=SDU67%40KEY123"))).toBe("SDU67@KEY123");
  });
});
