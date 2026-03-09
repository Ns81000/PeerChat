import { useCallback, useEffect, useRef, useState } from "react";
import Peer, { DataConnection } from "peerjs";
import { PEER_CONFIG, STUN_SERVERS, fetchIceServers, hostPeerId, guestPeerId, MAX_USERS } from "@/lib/peerConfig";
import type { PeerData, PeerList, HelloMessage, SystemMessage } from "@/lib/messageSchema";

const GUEST_CONNECT_TIMEOUT_MS = 8_000;
const MAX_CONNECT_RETRIES = 2;

interface UsePeerOptions {
  pin: string;
  isHost: boolean;
  onData: (data: PeerData, fromPeerId: string) => void;
}

interface UsePeerReturn {
  isConnected: boolean;
  isDisconnected: boolean;
  isRoomFull: boolean;
  error: string | null;
  userCount: number;
  userId: string;
  send: (data: PeerData) => void;
  sendBinary: (peerId: string, data: ArrayBuffer) => void;
  disconnect: () => void;
}

export function usePeer({ pin, isHost, onData }: UsePeerOptions): UsePeerReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [isRoomFull, setIsRoomFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(1);
  // Restore saved label so a reconnecting guest keeps the same identity (e.g. "User 2")
  const [userId, setUserId] = useState(() => {
    if (isHost) return "User 1";
    if (pin) return sessionStorage.getItem(`pc-label-${pin}`) || "";
    return "";
  });

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const userLabelCounterRef = useRef(1);
  const userLabelsRef = useRef<Map<string, string>>(new Map());
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  const send = useCallback((data: PeerData) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }, []);

  const sendBinary = useCallback((peerId: string, data: ArrayBuffer) => {
    const conn = connectionsRef.current.get(peerId);
    if (conn?.open) {
      conn.send(data);
    }
  }, []);

  const disconnect = useCallback(() => {
    connectionsRef.current.forEach((conn) => conn.close());
    connectionsRef.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
  }, []);

  useEffect(() => {
    if (!pin) return;

    let destroyed = false;
    let guestTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;

    // Reconnect signaling server when tab becomes visible after being backgrounded
    const handleVisibilityChange = () => {
      const peer = peerRef.current;
      if (document.visibilityState === "visible" && peer && !peer.destroyed && peer.disconnected) {
        console.log("Tab visible again, reconnecting signaling...");
        peer.reconnect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Fetch ICE servers (includes TURN) — runs in parallel with Peer signaling registration
    const turnPromise = fetchIceServers().catch(() => STUN_SERVERS);
    let resolvedIceServers: RTCIceServer[] | null = null;
    turnPromise.then((s) => { resolvedIceServers = s; });

    function init() {
      if (destroyed) return;

      const myId = isHost ? hostPeerId(pin) : guestPeerId(pin);
      const myLabel = isHost ? "User 1" : "";

      // Start with STUN for fast signaling registration.
      // Full ICE config (with TURN) is injected in peer.on("open") before any data connections.
      const peer = new Peer(myId, {
        ...PEER_CONFIG,
        config: { iceServers: STUN_SERVERS },
      });
      peerRef.current = peer;

      function setupConnection(conn: DataConnection) {
        conn.on("open", () => {
          if (guestTimeoutId) {
            clearTimeout(guestTimeoutId);
            guestTimeoutId = null;
          }

          connectionsRef.current.set(conn.peer, conn);
          setUserCount(connectionsRef.current.size + 1);
          setIsConnected(true);

          if (isHost) {
            userLabelCounterRef.current++;
            const label = `User ${userLabelCounterRef.current}`;
            userLabelsRef.current.set(conn.peer, label);

            const peerList: PeerList = {
              type: "peer-list",
              peers: Array.from(connectionsRef.current.keys()).filter((id) => id !== conn.peer),
              userLabel: label,
            };
            conn.send(peerList);

            const joinMsg: PeerData = {
              type: "system",
              id: crypto.randomUUID(),
              content: `${label} joined the room`,
              timestamp: Date.now(),
            };
            send(joinMsg);
            onDataRef.current(joinMsg, myId);
          } else {
            const hello: HelloMessage = {
              type: "hello",
              peerId: myId,
              label: userId || myLabel,
            };
            conn.send(hello);
          }
        });

        conn.on("data", (rawData) => {
          const data = rawData as PeerData;

          if (data.type === "peer-list") {
            const peerListData = data as PeerList;
            setUserId(peerListData.userLabel);
            // Persist the assigned label so reconnecting within the same session
            // sends the correct identity in the hello message
            sessionStorage.setItem(`pc-label-${pin}`, peerListData.userLabel);

            peerListData.peers.forEach((peerId) => {
              if (!connectionsRef.current.has(peerId)) {
                const newConn = peer.connect(peerId, { reliable: true });
                setupConnection(newConn);
              }
            });
            return;
          }

          if (data.type === "hello" && isHost) {
            const helloData = data as HelloMessage;
            if (helloData.label) {
              userLabelsRef.current.set(conn.peer, helloData.label);
            }
            return;
          }

          if (data.type === "system") {
            const sysMsg = data as SystemMessage;
            if (sysMsg.content === "Room is full") {
              setIsRoomFull(true);
              setError("Room is full. Try again later.");
              return;
            }
          }

          onDataRef.current(data, conn.peer);
        });

        conn.on("close", () => {
          const label = userLabelsRef.current.get(conn.peer) || "A user";
          connectionsRef.current.delete(conn.peer);
          userLabelsRef.current.delete(conn.peer);
          setUserCount(connectionsRef.current.size + 1);

          const leaveMsg: PeerData = {
            type: "system",
            id: crypto.randomUUID(),
            content: `${label} left the room`,
            timestamp: Date.now(),
          };
          onDataRef.current(leaveMsg, conn.peer);
        });

        conn.on("error", (err) => {
          console.error("Connection error:", err);
        });

        // Monitor ICE connection state for failure detection
        const checkIce = () => {
          const pc = (conn as any).peerConnection as RTCPeerConnection | undefined;
          if (!pc) return;
          pc.addEventListener("iceconnectionstatechange", () => {
            const state = pc.iceConnectionState;
            if (state === "failed") {
              console.warn(`ICE failed for ${conn.peer}, closing connection`);
              conn.close();
            }
          });
        };
        setTimeout(checkIce, 500);
      }

      function connectToHost(forceRelay = false) {
        // If retrying, force relay-only transport to avoid unstable STUN cycling
        if (forceRelay && resolvedIceServers) {
          const turnOnly = resolvedIceServers.filter((s) => {
            const urls = typeof s.urls === "string" ? [s.urls] : s.urls;
            return urls.some((u) => u.startsWith("turn:"));
          });
          if (turnOnly.length > 0) {
            (peer as any).options.config = {
              iceServers: turnOnly,
              iceTransportPolicy: "relay",
            };
          }
        }

        const hostConn = peer.connect(hostPeerId(pin), { reliable: true });
        setupConnection(hostConn);

        guestTimeoutId = setTimeout(() => {
          if (!connectionsRef.current.has(hostPeerId(pin))) {
            if (retryCount < MAX_CONNECT_RETRIES) {
              retryCount++;
              console.log(`Connection attempt ${retryCount} failed, retrying with relay...`);
              hostConn.close();
              connectToHost(true);
            } else {
              setError("Connection timed out. Check your PIN and try again.");
              peer.destroy();
            }
          }
        }, GUEST_CONNECT_TIMEOUT_MS);
      }

      peer.on("open", async () => {
        setIsDisconnected(false);

        if (isHost) {
          // Host only needs to be visible on the signaling server — no outbound
          // ICE needed yet. Show the room instantly and inject TURN in background
          // so it is ready before the first guest DataConnection opens.
          turnPromise
            .then((servers) => {
              if (!destroyed && !peer.destroyed) {
                resolvedIceServers = servers;
                (peer as any).options.config = { iceServers: servers };
              }
            })
            .catch(() => {});

          setIsConnected(true);
          setUserId("User 1");
        } else {
          // Guest MUST have TURN ready before dialing — critical for mobile /
          // carrier-grade NAT where STUN hole-punching always fails.
          // turnPromise started before new Peer(), so the extra wait here is
          // near-zero on fast connections and at most 4 s on very slow ones.
          try {
            const servers = await turnPromise;
            if (!destroyed && !peer.destroyed) {
              resolvedIceServers = servers;
              (peer as any).options.config = { iceServers: servers };
            }
          } catch {
            // Proceed with STUN-only if the fetch itself threw
          }
          if (destroyed || peer.destroyed) return;
          connectToHost();
        }
      });

      peer.on("disconnected", () => {
        setIsDisconnected(true);
        if (!peer.destroyed) {
          console.log("Signaling disconnected, attempting reconnect...");
          peer.reconnect();
        }
      });

      peer.on("connection", (conn) => {
        if (connectionsRef.current.size >= MAX_USERS - 1) {
          conn.on("open", () => {
            const fullMsg: SystemMessage = {
              type: "system",
              id: crypto.randomUUID(),
              content: "Room is full",
              timestamp: Date.now(),
            };
            conn.send(fullMsg);
            setTimeout(() => conn.close(), 500);
          });
          return;
        }
        setupConnection(conn);
      });

      peer.on("error", (err) => {
        console.error("Peer error:", err);
        if (guestTimeoutId) {
          clearTimeout(guestTimeoutId);
          guestTimeoutId = null;
        }
        if (err.type === "peer-unavailable") {
          setError("Room not found. Check your PIN and try again.");
        } else if (err.type === "unavailable-id") {
          setError("A room with this PIN already exists.");
        } else if (connectionsRef.current.size > 0) {
          // Already have active data connections; signaling errors are non-fatal
          console.warn("Signaling error (non-fatal, data connections active):", err.message);
        } else {
          setError(err.message || "Connection error");
        }
      });
    }

    // Start peer creation immediately with STUN — don't wait for TURN
    init();

    return () => {
      destroyed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (guestTimeoutId) {
        clearTimeout(guestTimeoutId);
      }
      connectionsRef.current.forEach((conn) => conn.close());
      connectionsRef.current.clear();
      peerRef.current?.destroy();
      peerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, isHost]);

  return { isConnected, isDisconnected, isRoomFull, error, userCount, userId, send, sendBinary, disconnect };
}
