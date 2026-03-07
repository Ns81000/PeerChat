export const PEER_CONFIG = {
  host: "0.peerjs.com",
  secure: true,
  debug: 0,
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
