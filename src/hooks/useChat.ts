import { useCallback, useRef, useState } from "react";
import type { PeerData, ChatMessage, DisplayMessage, SystemMessage, FileMeta, FileChunk, FileEnd, FileMessage } from "@/lib/messageSchema";

interface UseChatOptions {
  userId: string;
  sendToPeers: (data: PeerData) => void;
}

interface PendingFile {
  meta: FileMeta;
  chunks: ArrayBuffer[];
  received: number;
}

export interface FileTransferProgress {
  fileName: string;
  totalChunks: number;
  received: number;
}

export function useChat({ userId, sendToPeers }: UseChatOptions) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [fileTransfers, setFileTransfers] = useState<Map<string, FileTransferProgress>>(new Map());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pendingFilesRef = useRef<Map<string, PendingFile>>(new Map());
  const objectUrlsRef = useRef<string[]>([]);

  const addMessage = useCallback((msg: DisplayMessage) => {
    if (seenIdsRef.current.has(msg.id)) return;
    seenIdsRef.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const msg: ChatMessage = {
        type: "message",
        id: crypto.randomUUID(),
        senderId: "self",
        senderLabel: userId,
        content: text.trim(),
        timestamp: Date.now(),
      };
      addMessage(msg);
      sendToPeers(msg);
    },
    [userId, sendToPeers, addMessage]
  );

  const handleIncomingData = useCallback(
    (data: PeerData | FileMessage, _fromPeerId: string) => {
      if ((data as any).type === "file-message") {
        addMessage(data as FileMessage);
        return;
      }
      const peerData = data as PeerData;
      switch (peerData.type) {
        case "message":
          addMessage(peerData as ChatMessage);
          break;

        case "system":
          addMessage(peerData as SystemMessage);
          break;

        case "file-meta": {
          const meta = data as FileMeta;
          pendingFilesRef.current.set(meta.fileId, {
            meta,
            chunks: new Array(meta.totalChunks),
            received: 0,
          });
          setFileTransfers((prev) => {
            const next = new Map(prev);
            next.set(meta.fileId, {
              fileName: meta.name,
              totalChunks: meta.totalChunks,
              received: 0,
            });
            return next;
          });
          break;
        }

        case "file-chunk": {
          const chunk = data as FileChunk;
          const pending = pendingFilesRef.current.get(chunk.fileId);
          if (pending) {
            pending.chunks[chunk.chunkIndex] = chunk.data;
            pending.received++;
            const received = pending.received;
            setFileTransfers((prev) => {
              const next = new Map(prev);
              const entry = next.get(chunk.fileId);
              if (entry) {
                next.set(chunk.fileId, { ...entry, received });
              }
              return next;
            });
          }
          break;
        }

        case "file-end": {
          const end = data as FileEnd;
          const file = pendingFilesRef.current.get(end.fileId);
          if (file) {
            if (file.received !== file.meta.totalChunks) {
              console.warn(
                `Incomplete file transfer for "${file.meta.name}": received ${file.received}/${file.meta.totalChunks} chunks. Skipping assembly.`
              );
              pendingFilesRef.current.delete(end.fileId);
              setFileTransfers((prev) => {
                const next = new Map(prev);
                next.delete(end.fileId);
                return next;
              });
              break;
            }

            const blob = new Blob(file.chunks, { type: file.meta.mimeType });
            const objectUrl = URL.createObjectURL(blob);
            objectUrlsRef.current.push(objectUrl);

            const fileMsg: FileMessage = {
              type: "file-message",
              id: file.meta.id,
              senderId: file.meta.senderId,
              senderLabel: file.meta.senderLabel,
              fileName: file.meta.name,
              fileSize: file.meta.size,
              mimeType: file.meta.mimeType,
              objectUrl,
              timestamp: file.meta.timestamp,
            };
            addMessage(fileMsg);
            pendingFilesRef.current.delete(end.fileId);
            setFileTransfers((prev) => {
              const next = new Map(prev);
              next.delete(end.fileId);
              return next;
            });
          }
          break;
        }

        default:
          break;
      }
    },
    [addMessage]
  );

  const cleanup = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  return { messages, fileTransfers, sendMessage, handleIncomingData, cleanup };
}
