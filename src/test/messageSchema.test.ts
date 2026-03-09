import { describe, it, expect } from "vitest";
import type {
  ChatMessage,
  SystemMessage,
  FileMessage,
  DisplayMessage,
} from "@/lib/messageSchema";

describe("messageSchema types", () => {
  it("ChatMessage conforms to expected shape", () => {
    const msg: ChatMessage = {
      type: "message",
      id: "test-id",
      senderId: "peer-1",
      senderLabel: "User 1",
      content: "Hello",
      timestamp: Date.now(),
    };
    expect(msg.type).toBe("message");
    expect(msg.content).toBe("Hello");
  });

  it("SystemMessage conforms to expected shape", () => {
    const msg: SystemMessage = {
      type: "system",
      id: "sys-1",
      content: "User 2 joined",
      timestamp: Date.now(),
    };
    expect(msg.type).toBe("system");
  });

  it("FileMessage conforms to expected shape", () => {
    const fileMsg: FileMessage = {
      type: "file",
      id: "fm-1",
      senderId: "peer-1",
      senderLabel: "User 1",
      fileName: "photo.jpg",
      fileSize: 2048,
      mimeType: "image/jpeg",
      url: "https://example.com/photo.jpg",
      timestamp: Date.now(),
    };
    expect(fileMsg.type).toBe("file");
  });

  it("DisplayMessage union covers renderable types", () => {
    const msgs: DisplayMessage[] = [
      { type: "message", id: "1", senderId: "s", senderLabel: "S", content: "hi", timestamp: 0 },
      { type: "system", id: "2", content: "joined", timestamp: 0 },
      { type: "file", id: "3", senderId: "s", senderLabel: "S", fileName: "f", fileSize: 0, mimeType: "", url: "", timestamp: 0 },
    ];
    expect(msgs).toHaveLength(3);
  });
});
