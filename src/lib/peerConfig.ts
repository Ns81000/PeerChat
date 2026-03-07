export const PEER_CONFIG = {
  host: "0.peerjs.com",
  secure: true,
  debug: 1,
  config: {
    iceServers: [
      // STUN servers for public IP discovery
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.relay.metered.ca:80" },
      // Open Relay Project — free public TURN servers (https://www.metered.ca/tools/openrelay/)
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turns:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
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
