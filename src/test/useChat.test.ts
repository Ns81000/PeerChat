import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "@/hooks/useChat";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: () => ({
      on: function () { return this; },
      subscribe: function () { return this; },
    }),
    removeChannel: vi.fn(),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [] }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/file" } }),
      }),
    },
  },
}));

describe("useChat", () => {
  function createHook() {
    return renderHook(() =>
      useChat({ roomId: null, userId: "User 1" })
    );
  }

  it("starts with an empty message list", () => {
    const { result } = createHook();
    expect(result.current.messages).toEqual([]);
  });

  it("cleanup clears messages", () => {
    const { result } = createHook();

    act(() => {
      result.current.addLocalFileMessage({
        type: "file",
        id: "f1",
        senderId: "self",
        senderLabel: "User 1",
        fileName: "test.txt",
        fileSize: 100,
        mimeType: "text/plain",
        url: "https://example.com/test.txt",
        timestamp: Date.now(),
      });
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.cleanup();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("addLocalFileMessage adds a file message", () => {
    const { result } = createHook();

    act(() => {
      result.current.addLocalFileMessage({
        type: "file",
        id: "f2",
        senderId: "self",
        senderLabel: "User 1",
        fileName: "photo.jpg",
        fileSize: 2048,
        mimeType: "image/jpeg",
        url: "https://example.com/photo.jpg",
        timestamp: Date.now(),
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe("file");
  });

  it("deduplicates messages with the same ID", () => {
    const { result } = createHook();

    act(() => {
      result.current.addLocalFileMessage({
        type: "file",
        id: "dup-id",
        senderId: "self",
        senderLabel: "User 1",
        fileName: "test.txt",
        fileSize: 100,
        mimeType: "text/plain",
        url: "https://example.com/test.txt",
        timestamp: Date.now(),
      });
    });

    act(() => {
      result.current.addLocalFileMessage({
        type: "file",
        id: "dup-id",
        senderId: "self",
        senderLabel: "User 1",
        fileName: "test.txt",
        fileSize: 100,
        mimeType: "text/plain",
        url: "https://example.com/test.txt",
        timestamp: Date.now(),
      });
    });

    expect(result.current.messages).toHaveLength(1);
  });
});
