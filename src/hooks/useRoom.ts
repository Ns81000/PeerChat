import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, MAX_USERS } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CHANNEL_MAX_RETRIES = 3;
const CHANNEL_RETRY_DELAY_MS = 2_000;
/** Grace period (ms) before treating a presence leave as a real disconnect.
 *  Mobile browsers suspend WebSockets when the screen is locked or the tab is
 *  backgrounded — Supabase will auto-reconnect when the user returns, so a
 *  brief absence should not trigger a "user left" message. */
const LEAVE_GRACE_MS = 8_000;

interface UseRoomOptions {
  pin: string;
  isHost: boolean;
}

interface UseRoomReturn {
  isConnected: boolean;
  error: string | null;
  userCount: number;
  userId: string;
  userLabel: string;
  roomId: string | null;
  channel: RealtimeChannel | null;
  hostLeft: boolean;
  disconnect: () => Promise<void>;
}

export function useRoom({ pin, isHost }: UseRoomOptions): UseRoomReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [userId] = useState(() => crypto.randomUUID().slice(0, 8));
  const [userLabel, setUserLabel] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostLeft, setHostLeft] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const userLabelRef = useRef("");
  const presenceTrackedRef = useRef(false);
  const initialSyncDoneRef = useRef(false);
  const disconnectedRef = useRef(false);
  /** Pending grace-period timers for leave events, keyed by user_id */
  const leaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const disconnect = useCallback(async () => {
    if (disconnectedRef.current) return;
    disconnectedRef.current = true;

    const ch = channelRef.current;
    const rid = roomIdRef.current;

    // Host: broadcast host-left so other clients navigate away immediately
    if (isHost && ch) {
      await ch.send({ type: "broadcast", event: "host-left", payload: {} });
      // Brief delay to let the broadcast propagate before tearing down
      await new Promise((r) => setTimeout(r, 300));
    }

    if (ch) {
      channelRef.current = null;
      supabase.removeChannel(ch);
    }

    if (!rid) return;

    await supabase.from("members").delete().eq("room_id", rid).eq("user_id", userId);

    if (isHost) {
      const { data: files } = await supabase.storage.from("chat-files").list(pin);
      if (files?.length) {
        await supabase.storage.from("chat-files").remove(files.map((f) => `${pin}/${f.name}`));
      }
      await supabase.from("messages").delete().eq("room_id", rid);
      await supabase.from("members").delete().eq("room_id", rid);
      await supabase.from("rooms").delete().eq("id", rid);
    }
  }, [pin, userId, isHost]);

  useEffect(() => {
    const handler = () => {
      const rid = roomIdRef.current;
      if (!rid) return;
      supabase.from("members").delete().eq("room_id", rid).eq("user_id", userId);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [userId]);

  useEffect(() => {
    if (!pin) return;
    let cancelled = false;
    disconnectedRef.current = false;

    async function init() {
      try {
        if (isHost) {
          const { data: existing } = await supabase
            .from("rooms")
            .select("id")
            .eq("pin", pin)
            .maybeSingle();

          if (existing) {
            if (!cancelled) setError("A room with this PIN already exists.");
            return;
          }

          const { data: room, error: roomErr } = await supabase
            .from("rooms")
            .insert({ pin, host_id: userId })
            .select("id")
            .single();

          if (roomErr || !room) {
            if (!cancelled) setError("Failed to create room.");
            return;
          }

          if (cancelled) {
            await supabase.from("rooms").delete().eq("id", room.id);
            return;
          }

          roomIdRef.current = room.id;
          setRoomId(room.id);

          const label = "User 1";
          const { error: memberErr } = await supabase.from("members").insert({
            room_id: room.id,
            user_id: userId,
            user_label: label,
          });
          if (memberErr) {
            if (!cancelled) setError("Failed to join room.");
            return;
          }

          setUserLabel(label);
          userLabelRef.current = label;
          setUserCount(1);

          // System message: host joined
          await supabase.from("messages").insert({
            id: crypto.randomUUID(),
            room_id: room.id,
            sender_id: "system",
            sender_label: "System",
            type: "system",
            content: `${label} joined the room`,
          });
        } else {
          const { data: room } = await supabase
            .from("rooms")
            .select("id")
            .eq("pin", pin)
            .maybeSingle();

          if (!room) {
            if (!cancelled) setError("Room not found. Check your PIN and try again.");
            return;
          }

          if (cancelled) return;
          roomIdRef.current = room.id;
          setRoomId(room.id);

          const { data: members } = await supabase
            .from("members")
            .select("user_id, user_label")
            .eq("room_id", room.id);

          const currentCount = members?.length ?? 0;
          if (currentCount >= MAX_USERS) {
            if (!cancelled) setError("Room is full. Try again later.");
            return;
          }

          const existingLabels = new Set(members?.map((m) => m.user_label) ?? []);
          let labelNum = currentCount + 1;
          let label = `User ${labelNum}`;
          while (existingLabels.has(label)) {
            labelNum++;
            label = `User ${labelNum}`;
          }

          const { error: memberErr } = await supabase.from("members").insert({
            room_id: room.id,
            user_id: userId,
            user_label: label,
          });
          if (memberErr) {
            if (!cancelled) setError("Failed to join room.");
            return;
          }

          if (cancelled) {
            await supabase.from("members").delete().eq("room_id", room.id).eq("user_id", userId);
            return;
          }

          setUserLabel(label);
          userLabelRef.current = label;
          setUserCount(currentCount + 1);

          // System message: user joined
          await supabase.from("messages").insert({
            id: crypto.randomUUID(),
            room_id: room.id,
            sender_id: "system",
            sender_label: "System",
            type: "system",
            content: `${label} joined the room`,
          });
        }

        if (cancelled) return;

        let retries = 0;

        function subscribeChannel() {
          const channel = supabase.channel(`room:${pin}`, {
            config: { broadcast: { self: false } },
          });

          channel
            .on("presence", { event: "sync" }, () => {
              if (!presenceTrackedRef.current) return;
              const state = channel.presenceState();
              const count = Object.keys(state).length;
              setUserCount(count);
            })
            .on("presence", { event: "join" }, ({ newPresences }) => {
              // If a user reconnects within the grace period, cancel the pending leave
              for (const p of newPresences) {
                const data = p as { user_id?: string };
                if (data.user_id && leaveTimersRef.current.has(data.user_id)) {
                  clearTimeout(leaveTimersRef.current.get(data.user_id));
                  leaveTimersRef.current.delete(data.user_id);
                }
              }
            })
            .on("presence", { event: "leave" }, ({ leftPresences }) => {
              if (!initialSyncDoneRef.current || cancelled) return;

              for (const p of leftPresences) {
                const data = p as { user_id?: string; label?: string; is_host?: boolean };

                // Host leaving is always acted on immediately — no grace period
                if (data.is_host && !isHost) {
                  setHostLeft(true);
                  return;
                }

                // For regular users, wait LEAVE_GRACE_MS before treating as a real leave
                // so that brief mobile suspensions don't fire false "user left" messages
                if (
                  isHost &&
                  data.label &&
                  data.user_id &&
                  !data.is_host &&
                  roomIdRef.current &&
                  !disconnectedRef.current
                ) {
                  const uid = data.user_id;
                  const label = data.label;

                  // Clear any existing timer for this user (e.g. rapid disconnect/reconnect)
                  if (leaveTimersRef.current.has(uid)) {
                    clearTimeout(leaveTimersRef.current.get(uid));
                  }

                  const timer = setTimeout(() => {
                    leaveTimersRef.current.delete(uid);
                    if (cancelled || disconnectedRef.current || !roomIdRef.current) return;

                    // Re-check presence: if the user is back, skip
                    const ch = channelRef.current;
                    if (ch) {
                      const state = ch.presenceState();
                      const stillPresent = Object.values(state)
                        .flat()
                        .some((entry: any) => entry.user_id === uid);
                      if (stillPresent) return;
                    }

                    supabase
                      .from("messages")
                      .insert({
                        id: crypto.randomUUID(),
                        room_id: roomIdRef.current!,
                        sender_id: "system",
                        sender_label: "System",
                        type: "system",
                        content: `${label} left the room`,
                      })
                      .then();
                  }, LEAVE_GRACE_MS);

                  leaveTimersRef.current.set(uid, timer);
                }
              }
            })
            .on("broadcast", { event: "host-left" }, () => {
              if (!isHost) {
                setHostLeft(true);
              }
            })
            .subscribe(async (status) => {
              if (cancelled) return;

              if (status === "SUBSCRIBED") {
                await channel.track({
                  user_id: userId,
                  label: userLabelRef.current,
                  is_host: isHost,
                });
                presenceTrackedRef.current = true;
                setIsConnected(true);
                const state = channel.presenceState();
                setUserCount(Object.keys(state).length);
                // Wait for initial presence sync to settle before processing leave events
                setTimeout(() => {
                  if (!cancelled) initialSyncDoneRef.current = true;
                }, 1000);
              } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
                // Tear down the failed channel before retrying
                supabase.removeChannel(channel);

                if (retries < CHANNEL_MAX_RETRIES) {
                  retries++;
                  setTimeout(() => {
                    if (!cancelled) subscribeChannel();
                  }, CHANNEL_RETRY_DELAY_MS);
                } else {
                  setError("Failed to connect to the room channel. Please try again.");
                }
              }
            });

          channelRef.current = channel;
        }

        subscribeChannel();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Connection error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      presenceTrackedRef.current = false;
      initialSyncDoneRef.current = false;

      // Clear any pending leave grace-period timers
      for (const timer of leaveTimersRef.current.values()) {
        clearTimeout(timer);
      }
      leaveTimersRef.current.clear();

      const ch = channelRef.current;
      if (ch) {
        channelRef.current = null;
        supabase.removeChannel(ch);
      }

      const rid = roomIdRef.current;
      if (rid) {
        supabase.from("members").delete().eq("room_id", rid).eq("user_id", userId).then();
        if (isHost) {
          supabase.storage
            .from("chat-files")
            .list(pin)
            .then(({ data }) => {
              if (data?.length) {
                supabase.storage.from("chat-files").remove(data.map((f) => `${pin}/${f.name}`));
              }
            });
          supabase.from("messages").delete().eq("room_id", rid).then();
          supabase
            .from("members")
            .delete()
            .eq("room_id", rid)
            .then(() => {
              supabase.from("rooms").delete().eq("id", rid).then();
            });
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, isHost]);

  return {
    isConnected,
    error,
    userCount,
    userId,
    userLabel,
    roomId,
    channel: channelRef.current,
    hostLeft,
    disconnect,
  };
}
