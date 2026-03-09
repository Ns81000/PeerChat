import { useCallback, useRef, useState } from "react";
import { supabase, STORAGE_BUCKET, MAX_FILE_SIZE } from "@/lib/supabase";
import type { FileMessage } from "@/lib/messageSchema";

interface UseFileTransferOptions {
  pin: string;
  roomId: string | null;
  userId: string;
  addLocalFileMessage: (msg: FileMessage) => void;
}

export interface SendProgress {
  fileName: string;
  sent: number;
  total: number;
}

export function useFileTransfer({ pin, roomId, userId, addLocalFileMessage }: UseFileTransferOptions) {
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const sendFile = useCallback(
    async (file: File) => {
      if (isSendingRef.current) {
        setError("A file transfer is already in progress.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit.`);
        return;
      }
      if (!roomId) {
        setError("Not connected to a room.");
        return;
      }

      setError(null);
      setIsSending(true);
      isSendingRef.current = true;
      setSendProgress({ fileName: file.name, sent: 0, total: file.size });

      const fileId = crypto.randomUUID();
      const parts = file.name.split(".");
      const ext = parts.length > 1 ? parts.pop()! : "bin";
      const storagePath = `${pin}/${fileId}.${ext}`;

      try {
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        setSendProgress({ fileName: file.name, sent: file.size, total: file.size });

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        const msgId = crypto.randomUUID();
        const now = Date.now();

        const localMsg: FileMessage = {
          type: "file",
          id: msgId,
          senderId: "self",
          senderLabel: userId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          url: urlData.publicUrl,
          timestamp: now,
        };
        addLocalFileMessage(localMsg);

        const { error: insertErr } = await supabase.from("messages").insert({
          id: msgId,
          room_id: roomId,
          sender_id: "self-" + userId,
          sender_label: userId,
          type: "file",
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          storage_path: storagePath,
        });

        if (insertErr) {
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
          throw insertErr;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "File transfer failed.";
        setError(message);
      } finally {
        setSendProgress(null);
        setIsSending(false);
        isSendingRef.current = false;
      }
    },
    [pin, roomId, userId, addLocalFileMessage]
  );

  return { sendFile, sendProgress, isSending, error };
}
