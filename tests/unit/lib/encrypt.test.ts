import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "crypto";

// Set a test encryption key before importing encrypt module
const TEST_KEY = randomBytes(32).toString("hex");
beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

describe("encrypt/decrypt", () => {
  it("round-trips a simple string", async () => {
    const { encrypt, decrypt } = await import("#/lib/encrypt");
    const plaintext = "sk-ant-api03-test-key-12345";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same input (unique IV)", async () => {
    const { encrypt } = await import("#/lib/encrypt");
    const plaintext = "same-input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it("produces format iv:authTag:ciphertext", async () => {
    const { encrypt } = await import("#/lib/encrypt");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    // IV is 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext length varies
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("throws on malformed input", async () => {
    const { decrypt } = await import("#/lib/encrypt");
    expect(() => decrypt("not-valid")).toThrow();
    expect(() => decrypt("aa:bb")).toThrow("Malformed encrypted value");
  });

  it("handles empty string", async () => {
    const { encrypt, decrypt } = await import("#/lib/encrypt");
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("handles unicode content", async () => {
    const { encrypt, decrypt } = await import("#/lib/encrypt");
    const plaintext = "Hello 世界 🌍";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });
});
