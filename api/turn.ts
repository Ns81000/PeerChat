// Vercel Serverless Function — fetches temporary TURN credentials from Metered.ca
// Set METERED_API_KEY and METERED_APP_NAME in Vercel Environment Variables

const STUN_FALLBACK = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default async function handler(req: any, res: any) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.METERED_API_KEY;
  const appName = process.env.METERED_APP_NAME;

  if (!apiKey || !appName) {
    // No TURN configured — return STUN-only (works on same network)
    return res.status(200).json(STUN_FALLBACK);
  }

  try {
    const response = await fetch(
      `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );

    if (!response.ok) {
      console.error(`Metered API error: ${response.status}`);
      return res.status(200).json(STUN_FALLBACK);
    }

    const iceServers = await response.json();

    // Cache for 12 hours (credentials valid for ~24h)
    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=3600");
    return res.status(200).json(iceServers);
  } catch (err) {
    console.error("TURN credential fetch failed:", err);
    return res.status(200).json(STUN_FALLBACK);
  }
}
