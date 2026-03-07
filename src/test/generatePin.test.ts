import { describe, it, expect } from "vitest";
import { generatePin } from "@/lib/generatePin";

describe("generatePin", () => {
  it("returns a string of exactly 6 digits", () => {
    const pin = generatePin();
    expect(pin).toMatch(/^\d{6}$/);
  });

  it("always returns pins in the range 100000-999999", () => {
    for (let i = 0; i < 100; i++) {
      const num = Number(generatePin());
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it("generates different pins across multiple calls", () => {
    const pins = new Set<string>();
    for (let i = 0; i < 50; i++) {
      pins.add(generatePin());
    }
    expect(pins.size).toBeGreaterThan(1);
  });
});
