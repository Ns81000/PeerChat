export const PEER_CONFIG = {
  host: "0.peerjs.com",
  secure: true,
  debug: 0,
  config: {
    iceServers: [
      // STUN servers for public IP discovery
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.relay.metered.ca:80" },
      // TURN relay servers for symmetric NAT traversal (mobile carriers, strict firewalls)
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "e8dd65b92f0bfbbc8d3e6783",
        credential: "3n7+bMSs1MxKqkZl",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "e8dd65b92f0bfbbc8d3e6783",
        credential: "3n7+bMSs1MxKqkZl",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "e8dd65b92f0bfbbc8d3e6783",
        credential: "3n7+bMSs1MxKqkZl",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "e8dd65b92f0bfbbc8d3e6783",
        credential: "3n7+bMSs1MxKqkZl",
      },
    ],
  },
};

export const CHUNK_SIZE = 65536; // 64KB
export const MAX_USERS = 10;
export const PIN_LENGTH = 6;

export function hostPeerId(pin: string): string {
  return `pc-${pin}-host`;
}

export function guestPeerId(pin: string): string {
  return `pc-${pin}-${crypto.randomUUID().slice(0, 8)}`;
}
