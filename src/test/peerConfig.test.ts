import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {},
  STORAGE_BUCKET: "chat-files",
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  MAX_USERS: 10,
  PIN_LENGTH: 6,
}));

import { MAX_USERS, PIN_LENGTH } from "@/lib/supabase";

describe("supabase config", () => {
  it("exports correct constants", () => {
    expect(MAX_USERS).toBe(10);
    expect(PIN_LENGTH).toBe(6);
  });
});
