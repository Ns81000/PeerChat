import { describe, it, expect } from "vitest";
import { hostPeerId, guestPeerId, CHUNK_SIZE, MAX_USERS, PIN_LENGTH, PEER_CONFIG, STUN_SERVERS } from "@/lib/peerConfig";

describe("peerConfig", () => {
  it("exports correct constants", () => {
    expect(CHUNK_SIZE).toBe(65536);
    expect(MAX_USERS).toBe(10);
    expect(PIN_LENGTH).toBe(6);
  });

  it("PEER_CONFIG has correct signaling host", () => {
    expect(PEER_CONFIG.host).toBe("0.peerjs.com");
    expect(PEER_CONFIG.secure).toBe(true);
  });

  it("STUN_SERVERS contains at least one server", () => {
    expect(STUN_SERVERS.length).toBeGreaterThanOrEqual(1);
    expect(STUN_SERVERS[0].urls).toContain("stun:");
  });

  it("hostPeerId generates deterministic ID", () => {
    expect(hostPeerId("123456")).toBe("pc-123456-host");
    expect(hostPeerId("999999")).toBe("pc-999999-host");
  });

  it("guestPeerId includes the pin and a random suffix", () => {
    const id = guestPeerId("482910");
    expect(id).toMatch(/^pc-482910-[a-f0-9]{8}$/);
  });

  it("guestPeerId generates unique IDs", () => {
    const id1 = guestPeerId("482910");
    const id2 = guestPeerId("482910");
    expect(id1).not.toBe(id2);
  });
});
