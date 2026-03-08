/** Base PeerJS signaling config (without ICE servers — those are fetched dynamically) */
export const PEER_CONFIG = {
  host: "0.peerjs.com",
  secure: true,
  debug: 0,
};

/** Minimal STUN-only config used as fallback when TURN credentials are unavailable */
export const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Fetches dynamic TURN credentials from the Vercel API route (/api/turn).
 * Falls back to STUN-only if the API is unavailable (e.g. local dev).
 */
const TURN_FETCH_TIMEOUT_MS = 3_000;

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TURN_FETCH_TIMEOUT_MS);
    const res = await fetch("/api/turn", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return STUN_SERVERS;
    const servers: RTCIceServer[] = await res.json();
    // Merge: always include our own STUN servers + whatever TURN the API returns
    return [...STUN_SERVERS, ...servers];
  } catch {
    // Timeout, local dev, or network error — STUN only (works on same network)
    return STUN_SERVERS;
  }
}

export const CHUNK_SIZE = 65536; // 64KB
export const MAX_USERS = 10;
export const PIN_LENGTH = 6;

export function hostPeerId(pin: string): string {
  return `pc-${pin}-host`;
}

export function guestPeerId(pin: string): string {
  return `pc-${pin}-${crypto.randomUUID().slice(0, 8)}`;
}
