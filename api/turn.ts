// Vercel Serverless Function — returns TURN server credentials
//
// Set these in Vercel Environment Variables:
//   TURN_SERVER   — e.g. "free.expressturn.com:3478"
//   TURN_USERNAME — e.g. "000000002088268790"
//   TURN_PASSWORD — e.g. "uLmr+9TtQ+i7LMMOfg8OySpdqVA="
//
// If not set, returns STUN-only and the client falls back to its built-in public TURN servers.

const STUN_FALLBACK = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const server = process.env.TURN_SERVER;
  const username = process.env.TURN_USERNAME;
  const password = process.env.TURN_PASSWORD;

  if (!server || !username || !password) {
    return res.status(200).json(STUN_FALLBACK);
  }

  const iceServers = [
    { urls: `turn:${server}`, username, credential: password },
    { urls: `turn:${server}?transport=tcp`, username, credential: password },
  ];

  // Cache for 6 hours
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=3600");
  return res.status(200).json(iceServers);
}
