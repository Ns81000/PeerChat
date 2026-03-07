import { describe, it, expect } from "vitest";
import type {
  ChatMessage,
  SystemMessage,
  FileMeta,
  FileChunk,
  FileEnd,
  PeerList,
  HelloMessage,
  FileMessage,
  PeerData,
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

  it("FileMeta conforms to expected shape", () => {
    const meta: FileMeta = {
      type: "file-meta",
      id: "meta-1",
      fileId: "file-1",
      senderId: "peer-1",
      senderLabel: "User 1",
      name: "test.pdf",
      size: 1024,
      mimeType: "application/pdf",
      totalChunks: 1,
      timestamp: Date.now(),
    };
    expect(meta.type).toBe("file-meta");
    expect(meta.totalChunks).toBe(1);
  });

  it("FileChunk conforms to expected shape", () => {
    const chunk: FileChunk = {
      type: "file-chunk",
      fileId: "file-1",
      chunkIndex: 0,
      data: new ArrayBuffer(100),
    };
    expect(chunk.type).toBe("file-chunk");
    expect(chunk.chunkIndex).toBe(0);
  });

  it("FileEnd conforms to expected shape", () => {
    const end: FileEnd = {
      type: "file-end",
      fileId: "file-1",
    };
    expect(end.type).toBe("file-end");
  });

  it("PeerList conforms to expected shape", () => {
    const list: PeerList = {
      type: "peer-list",
      peers: ["peer-1", "peer-2"],
      userLabel: "User 3",
    };
    expect(list.type).toBe("peer-list");
    expect(list.peers).toHaveLength(2);
  });

  it("HelloMessage conforms to expected shape", () => {
    const hello: HelloMessage = {
      type: "hello",
      peerId: "peer-1",
      label: "User 1",
    };
    expect(hello.type).toBe("hello");
  });

  it("FileMessage conforms to expected shape", () => {
    const fileMsg: FileMessage = {
      type: "file-message",
      id: "fm-1",
      senderId: "peer-1",
      senderLabel: "User 1",
      fileName: "photo.jpg",
      fileSize: 2048,
      mimeType: "image/jpeg",
      objectUrl: "blob:http://localhost/abc",
      timestamp: Date.now(),
    };
    expect(fileMsg.type).toBe("file-message");
  });

  it("PeerData union covers all wire types", () => {
    const messages: PeerData[] = [
      { type: "message", id: "1", senderId: "s", senderLabel: "S", content: "hi", timestamp: 0 },
      { type: "system", id: "2", content: "joined", timestamp: 0 },
      { type: "file-meta", id: "3", fileId: "f", senderId: "s", senderLabel: "S", name: "f", size: 0, mimeType: "", totalChunks: 0, timestamp: 0 },
      { type: "file-chunk", fileId: "f", chunkIndex: 0, data: new ArrayBuffer(0) },
      { type: "file-end", fileId: "f" },
      { type: "peer-list", peers: [], userLabel: "U" },
      { type: "hello", peerId: "p", label: "U" },
    ];
    expect(messages).toHaveLength(7);
  });

  it("DisplayMessage union covers renderable types", () => {
    const msgs: DisplayMessage[] = [
      { type: "message", id: "1", senderId: "s", senderLabel: "S", content: "hi", timestamp: 0 },
      { type: "system", id: "2", content: "joined", timestamp: 0 },
      { type: "file-message", id: "3", senderId: "s", senderLabel: "S", fileName: "f", fileSize: 0, mimeType: "", objectUrl: "", timestamp: 0 },
    ];
    expect(msgs).toHaveLength(3);
  });
});
