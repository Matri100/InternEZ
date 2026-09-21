import { describe, expect, it } from "vitest";

// EARLY_ACCESS_KEY is read once at module load, so it has to be set before
// the import below rather than per-test.
process.env.EARLY_ACCESS_KEY = "test-key-123";
const { checkEarlyAccessKey, isEarlyAccessEnabled } = await import("./earlyAccess.js");

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
