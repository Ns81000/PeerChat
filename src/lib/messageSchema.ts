export type MessageType = "message" | "file-meta" | "file-chunk" | "file-end" | "system" | "peer-list" | "hello";

export interface ChatMessage {
  type: "message";
  id: string;
  senderId: string;
  senderLabel: string;
  content: string;
  timestamp: number;
}

export interface SystemMessage {
  type: "system";
  id: string;
  content: string;
  timestamp: number;
}

export interface FileMeta {
  type: "file-meta";
  id: string;
  fileId: string;
  senderId: string;
  senderLabel: string;
  name: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  timestamp: number;
}

export interface FileChunk {
  type: "file-chunk";
  fileId: string;
  chunkIndex: number;
  data: ArrayBuffer;
}

export interface FileEnd {
  type: "file-end";
  fileId: string;
}

export interface PeerList {
  type: "peer-list";
  peers: string[];
  userLabel: string;
}

export interface HelloMessage {
  type: "hello";
  peerId: string;
  label: string;
}

export interface FileMessage {
  type: "file-message";
  id: string;
  senderId: string;
  senderLabel: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  objectUrl: string;
  timestamp: number;
}

export type PeerData = ChatMessage | SystemMessage | FileMeta | FileChunk | FileEnd | PeerList | HelloMessage;
export type DisplayMessage = ChatMessage | SystemMessage | FileMessage;
