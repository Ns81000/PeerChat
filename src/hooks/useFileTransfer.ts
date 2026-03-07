import { useCallback, useState } from "react";
import { CHUNK_SIZE } from "@/lib/peerConfig";
import type { PeerData, FileMeta, FileChunk, FileEnd } from "@/lib/messageSchema";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

interface UseFileTransferOptions {
  userId: string;
  sendToPeers: (data: PeerData) => void;
  addLocalFileMessage: (file: File, objectUrl: string) => void;
}

export interface SendProgress {
  fileName: string;
  sent: number;
  total: number;
}

export function useFileTransfer({ userId, sendToPeers, addLocalFileMessage }: UseFileTransferOptions) {
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendFile = useCallback(
    async (file: File) => {
      if (isSending) {
        setError("A file transfer is already in progress.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit.`);
        return;
      }

      setError(null);
      setIsSending(true);

      const fileId = crypto.randomUUID();
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      const localUrl = URL.createObjectURL(file);
      addLocalFileMessage(file, localUrl);

      const meta: FileMeta = {
        type: "file-meta",
        id: crypto.randomUUID(),
        fileId,
        senderId: "self",
        senderLabel: userId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        totalChunks,
        timestamp: Date.now(),
      };
      sendToPeers(meta);

      setSendProgress({ fileName: file.name, sent: 0, total: totalChunks });

      try {
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const chunk = file.slice(start, start + CHUNK_SIZE);
          const buffer = await chunk.arrayBuffer();
          const chunkMsg: FileChunk = {
            type: "file-chunk",
            fileId,
            chunkIndex: i,
            data: buffer,
          };
          sendToPeers(chunkMsg);

          setSendProgress({ fileName: file.name, sent: i + 1, total: totalChunks });

          if (i % 10 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        const endMsg: FileEnd = {
          type: "file-end",
          fileId,
        };
        sendToPeers(endMsg);
      } catch (err) {
        const message = err instanceof Error ? err.message : "File transfer failed.";
        setError(message);
        console.error("File transfer error:", err);
      } finally {
        setSendProgress(null);
        setIsSending(false);
      }
    },
    [userId, sendToPeers, addLocalFileMessage, isSending]
  );

  return { sendFile, sendProgress, isSending, error };
}
