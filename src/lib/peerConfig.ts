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

/** Free public TURN servers as ultimate fallback (metered.ca open relay) */
const PUBLIC_TURN_FALLBACK: RTCIceServer[] = [
  {
    urls: "turn:a.relay.metered.ca:80",
    username: "e8dd65b92f4981b9aebf2db4",
    credential: "xlEB/cKJfrRWMJYP",
  },
  {
    urls: "turn:a.relay.metered.ca:443",
    username: "e8dd65b92f4981b9aebf2db4",
    credential: "xlEB/cKJfrRWMJYP",
  },
  {
    urls: "turn:a.relay.metered.ca:443?transport=tcp",
    username: "e8dd65b92f4981b9aebf2db4",
    credential: "xlEB/cKJfrRWMJYP",
  },
];

/**
 * Fetches dynamic TURN credentials from the Vercel API route (/api/turn).
 * Falls back to public TURN servers if the API is unavailable.
 */
const TURN_FETCH_TIMEOUT_MS = 4_000;

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TURN_FETCH_TIMEOUT_MS);
    const res = await fetch("/api/turn", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return [...STUN_SERVERS, ...PUBLIC_TURN_FALLBACK];
    const servers: RTCIceServer[] = await res.json();
    // Check if the API returned actual TURN servers (not just STUN fallback)
    const hasTurn = servers.some((s) => {
      const urls = typeof s.urls === "string" ? [s.urls] : s.urls;
      return urls.some((u) => u.startsWith("turn:"));
    });
    if (!hasTurn) {
      // API returned STUN-only fallback (env vars not set) — add public TURN
      return [...STUN_SERVERS, ...PUBLIC_TURN_FALLBACK];
    }
    // Always append public TURN alongside private credentials.
    // Private TURN (ExpressTurn) uses port 3478 UDP which is blocked on many
    // mobile carrier networks. Public fallback runs on ports 80 & 443 (TCP/UDP)
    // which pass through virtually every firewall, guaranteeing a working relay.
    return [...STUN_SERVERS, ...servers, ...PUBLIC_TURN_FALLBACK];
  } catch {
    // Timeout, local dev, or network error — use public TURN fallback
    return [...STUN_SERVERS, ...PUBLIC_TURN_FALLBACK];
  }
}

export const CHUNK_SIZE = 65536; // 64KB
export const MAX_USERS = 10;
export const PIN_LENGTH = 6;

export function hostPeerId(pin: string): string {
  return `pc-${pin}-host`;
}

export function guestPeerId(pin: string): string {
  const key = `pc-guest-id-${pin}`;
  const cached = sessionStorage.getItem(key);
  if (cached) return cached;
  const id = `pc-${pin}-${crypto.randomUUID().slice(0, 8)}`;
  sessionStorage.setItem(key, id);
  return id;
}

/** Clears the persisted guest identity for a given PIN (call on intentional leave) */
export function clearGuestSession(pin: string): void {
  sessionStorage.removeItem(`pc-guest-id-${pin}`);
  sessionStorage.removeItem(`pc-label-${pin}`);
}
