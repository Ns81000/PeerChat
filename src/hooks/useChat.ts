import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DisplayMessage, ChatMessage, SystemMessage, FileMessage } from "@/lib/messageSchema";

interface UseChatOptions {
  roomId: string | null;
  userId: string;
}

export function useChat({ roomId, userId }: UseChatOptions) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const MAX_SEEN_IDS = 5000;

  const addMessage = useCallback((msg: DisplayMessage) => {
    if (seenIdsRef.current.has(msg.id)) return;
    if (seenIdsRef.current.size >= MAX_SEEN_IDS) {
      const iter = seenIdsRef.current.values();
      const oldest = iter.next().value;
      if (oldest) seenIdsRef.current.delete(oldest);
    }
    seenIdsRef.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    async function loadHistory() {
      const { data: rows } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (!mounted || !rows) return;

      for (const row of rows) {
        if (row.sender_id === "self-" + userId) continue;

        if (row.type === "message") {
          addMessage({
            type: "message",
            id: row.id,
            senderId: row.sender_id,
            senderLabel: row.sender_label,
            content: row.content,
            timestamp: new Date(row.created_at).getTime(),
          });
        } else if (row.type === "system") {
          addMessage({
            type: "system",
            id: row.id,
            content: row.content,
            timestamp: new Date(row.created_at).getTime(),
          });
        } else if (row.type === "file") {
          const { data } = supabase.storage.from("chat-files").getPublicUrl(row.storage_path);
          addMessage({
            type: "file",
            id: row.id,
            senderId: row.sender_id,
            senderLabel: row.sender_label,
            fileName: row.file_name,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            url: data.publicUrl,
            timestamp: new Date(row.created_at).getTime(),
          });
        }
      }
    }

    loadHistory();

    const sub = supabase
      .channel(`db-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.sender_id === "self-" + userId) return;

          if (row.type === "message") {
            const msg: ChatMessage = {
              type: "message",
              id: row.id,
              senderId: row.sender_id,
              senderLabel: row.sender_label,
              content: row.content,
              timestamp: new Date(row.created_at).getTime(),
            };
            addMessage(msg);
          } else if (row.type === "system") {
            const msg: SystemMessage = {
              type: "system",
              id: row.id,
              content: row.content,
              timestamp: new Date(row.created_at).getTime(),
            };
            addMessage(msg);
          } else if (row.type === "file") {
            const { data } = supabase.storage
              .from("chat-files")
              .getPublicUrl(row.storage_path);
            const msg: FileMessage = {
              type: "file",
              id: row.id,
              senderId: row.sender_id,
              senderLabel: row.sender_label,
              fileName: row.file_name,
              fileSize: row.file_size,
              mimeType: row.mime_type,
              url: data.publicUrl,
              timestamp: new Date(row.created_at).getTime(),
            };
            addMessage(msg);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(sub);
    };
  }, [roomId, userId, addMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !roomId) return;
      const id = crypto.randomUUID();
      const now = Date.now();

      const localMsg: ChatMessage = {
        type: "message",
        id,
        senderId: "self",
        senderLabel: userId,
        content: text.trim(),
        timestamp: now,
      };
      addMessage(localMsg);

      const { error } = await supabase.from("messages").insert({
        id,
        room_id: roomId,
        sender_id: "self-" + userId,
        sender_label: userId,
        type: "message",
        content: text.trim(),
      });

      if (error) {
        seenIdsRef.current.delete(id);
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    },
    [roomId, userId, addMessage]
  );

  const addLocalFileMessage = useCallback(
    (msg: FileMessage) => {
      addMessage(msg);
    },
    [addMessage]
  );

  const cleanup = useCallback(() => {
    setMessages([]);
    seenIdsRef.current.clear();
  }, []);

  return { messages, sendMessage, addLocalFileMessage, cleanup };
}
