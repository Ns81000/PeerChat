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

    // --- Channel setup (run in parallel with DB ops) ---
    let retries = 0;
    /** Resolves once the channel reaches SUBSCRIBED state */
    let resolveChannelReady: () => void;
    let rejectChannelReady: (err: Error) => void;
    const channelReady = new Promise<void>((res, rej) => {
      resolveChannelReady = res;
      rejectChannelReady = rej;
    });

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

            if (data.is_host && !isHost) {
              setHostLeft(true);
              return;
            }

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

              if (leaveTimersRef.current.has(uid)) {
                clearTimeout(leaveTimersRef.current.get(uid));
              }

              const timer = setTimeout(() => {
                leaveTimersRef.current.delete(uid);
                if (cancelled || disconnectedRef.current || !roomIdRef.current) return;

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
            resolveChannelReady();
          } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
            supabase.removeChannel(channel);

            if (retries < CHANNEL_MAX_RETRIES) {
              retries++;
              setTimeout(() => {
                if (!cancelled) subscribeChannel();
              }, CHANNEL_RETRY_DELAY_MS);
            } else {
              rejectChannelReady(new Error("Failed to connect to the room channel. Please try again."));
            }
          }
        });

      channelRef.current = channel;
    }

    // Start channel subscription immediately — don't wait for DB
    subscribeChannel();

    // --- DB ops (run in parallel with channel setup) ---
    async function initRoom() {
      try {
        let rid: string;
        let label: string;
        let count: number;

        if (isHost) {
          const { data, error: rpcErr } = await supabase.rpc("create_room", {
            p_pin: pin,
            p_host_id: userId,
            p_user_label: "User 1",
          });

          if (rpcErr) {
            if (cancelled) return;
            if (rpcErr.message.includes("PIN_EXISTS")) {
              setError("A room with this PIN already exists.");
            } else {
              setError("Failed to create room.");
            }
            return;
          }

          const row = data[0];
          rid = row.room_id;
          label = row.user_label;
          count = 1;
        } else {
          const { data, error: rpcErr } = await supabase.rpc("join_room", {
            p_pin: pin,
            p_user_id: userId,
            p_max_users: MAX_USERS,
          });

          if (rpcErr) {
            if (cancelled) return;
            if (rpcErr.message.includes("ROOM_NOT_FOUND")) {
              setError("Room not found. Check your PIN and try again.");
            } else if (rpcErr.message.includes("ROOM_FULL")) {
              setError("Room is full. Try again later.");
            } else {
              setError("Failed to join room.");
            }
            return;
          }

          const row = data[0];
          rid = row.room_id;
          label = row.user_label;
          count = row.member_count;
        }

        if (cancelled) {
          // Undo: clean up the member (and room if host)
          await supabase.from("members").delete().eq("room_id", rid).eq("user_id", userId);
          if (isHost) {
            await supabase.from("messages").delete().eq("room_id", rid);
            await supabase.from("members").delete().eq("room_id", rid);
            await supabase.from("rooms").delete().eq("id", rid);
          }
          return;
        }

        roomIdRef.current = rid;
        setRoomId(rid);
        setUserLabel(label);
        userLabelRef.current = label;
        setUserCount(count);

        // Wait for the channel that was started in parallel
        await channelReady;

        if (cancelled) return;

        const ch = channelRef.current;
        if (ch) {
          await ch.track({
            user_id: userId,
            label,
            is_host: isHost,
          });
          presenceTrackedRef.current = true;
          setIsConnected(true);
          const state = ch.presenceState();
          setUserCount(Object.keys(state).length);
          // Grace period already covers false leaves — use minimal sync delay
          setTimeout(() => {
            if (!cancelled) initialSyncDoneRef.current = true;
          }, 200);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Connection error");
        }
      }
    }

    initRoom();

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
