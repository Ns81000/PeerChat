import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChat } from "@/hooks/useChat";

// jsdom doesn't provide URL.createObjectURL / revokeObjectURL
const origCreateObjectURL = URL.createObjectURL;
const origRevokeObjectURL = URL.revokeObjectURL;

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
  URL.createObjectURL = origCreateObjectURL;
  URL.revokeObjectURL = origRevokeObjectURL;
});

describe("useChat", () => {
  const mockSend = vi.fn();

  function createHook() {
    return renderHook(() => useChat({ userId: "User 1", sendToPeers: mockSend }));
  }

  it("starts with an empty message list", () => {
    const { result } = createHook();
    expect(result.current.messages).toEqual([]);
  });

  it("sendMessage adds a local message and broadcasts", () => {
    const { result } = createHook();

    act(() => {
      result.current.sendMessage("Hello world");
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe("message");
    expect((result.current.messages[0] as any).content).toBe("Hello world");
    expect((result.current.messages[0] as any).senderId).toBe("self");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("ignores empty or whitespace-only messages", () => {
    const { result } = createHook();

    act(() => {
      result.current.sendMessage("");
    });
    act(() => {
      result.current.sendMessage("   ");
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("deduplicates messages with the same ID", () => {
    const { result } = createHook();

    const msg = {
      type: "message" as const,
      id: "dup-id",
      senderId: "peer-1",
      senderLabel: "User 2",
      content: "Test",
      timestamp: Date.now(),
    };

    act(() => {
      result.current.handleIncomingData(msg, "peer-1");
    });
    act(() => {
      result.current.handleIncomingData(msg, "peer-1");
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it("handles incoming system messages", () => {
    const { result } = createHook();

    act(() => {
      result.current.handleIncomingData(
        { type: "system", id: "sys-1", content: "User 2 joined", timestamp: Date.now() },
        "host"
      );
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe("system");
  });

  it("tracks file transfer progress during chunked receive", () => {
    const { result } = createHook();

    act(() => {
      result.current.handleIncomingData(
        {
          type: "file-meta",
          id: "fm-1",
          fileId: "f1",
          senderId: "peer-1",
          senderLabel: "User 2",
          name: "test.txt",
          size: 100,
          mimeType: "text/plain",
          totalChunks: 2,
          timestamp: Date.now(),
        },
        "peer-1"
      );
    });

    expect(result.current.fileTransfers.size).toBe(1);
    const progress = result.current.fileTransfers.get("f1");
    expect(progress?.fileName).toBe("test.txt");
    expect(progress?.received).toBe(0);

    act(() => {
      result.current.handleIncomingData(
        { type: "file-chunk", fileId: "f1", chunkIndex: 0, data: new ArrayBuffer(50) },
        "peer-1"
      );
    });

    expect(result.current.fileTransfers.get("f1")?.received).toBe(1);
  });

  it("assembles file on file-end and clears transfer progress", () => {
    const { result } = createHook();

    act(() => {
      result.current.handleIncomingData(
        {
          type: "file-meta",
          id: "fm-2",
          fileId: "f2",
          senderId: "peer-1",
          senderLabel: "User 2",
          name: "photo.jpg",
          size: 100,
          mimeType: "image/jpeg",
          totalChunks: 1,
          timestamp: Date.now(),
        },
        "peer-1"
      );
    });

    act(() => {
      result.current.handleIncomingData(
        { type: "file-chunk", fileId: "f2", chunkIndex: 0, data: new ArrayBuffer(100) },
        "peer-1"
      );
    });

    act(() => {
      result.current.handleIncomingData(
        { type: "file-end", fileId: "f2" },
        "peer-1"
      );
    });

    expect(result.current.fileTransfers.size).toBe(0);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe("file-message");
  });

  it("cleanup revokes object URLs", () => {
    const revokeMock = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    revokeMock.mockClear();
    const { result } = createHook();

    act(() => {
      result.current.handleIncomingData(
        {
          type: "file-meta",
          id: "fm-3",
          fileId: "f3",
          senderId: "peer-1",
          senderLabel: "User 2",
          name: "doc.pdf",
          size: 50,
          mimeType: "application/pdf",
          totalChunks: 1,
          timestamp: Date.now(),
        },
        "peer-1"
      );
    });

    act(() => {
      result.current.handleIncomingData(
        { type: "file-chunk", fileId: "f3", chunkIndex: 0, data: new ArrayBuffer(50) },
        "peer-1"
      );
    });

    act(() => {
      result.current.handleIncomingData(
        { type: "file-end", fileId: "f3" },
        "peer-1"
      );
    });

    act(() => {
      result.current.cleanup();
    });

    expect(revokeMock).toHaveBeenCalled();
  });
});
