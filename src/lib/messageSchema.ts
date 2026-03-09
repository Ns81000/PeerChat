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

export interface FileMessage {
  type: "file";
  id: string;
  senderId: string;
  senderLabel: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  timestamp: number;
}

export type DisplayMessage = ChatMessage | SystemMessage | FileMessage;
