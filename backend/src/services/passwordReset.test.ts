import { describe, expect, it } from "vitest";
import { generateResetToken, hashResetToken } from "./passwordReset.js";

describe("generateResetToken", () => {
  it("returns a token whose hash matches the stored tokenHash", () => {
    const { token, tokenHash } = generateResetToken();
    expect(hashResetToken(token)).toBe(tokenHash);
  });

  it("produces a different token on every call", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});
