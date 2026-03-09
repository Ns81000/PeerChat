import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 20 },
  },
});

export const STORAGE_BUCKET = "chat-files";
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_USERS = 10;
export const PIN_LENGTH = 6;

/**
 * Warm the Supabase Realtime WebSocket on module load.
 * By connecting a disposable channel early (Index / Join pages import
 * supabase.ts transitively), the WS handshake + auth finishes while the
 * user is still reading the landing page. When useRoom later subscribes
 * its own channel, the underlying socket is already open — saving ~200-400ms.
 */
const warmChannel = supabase.channel("_warm");
warmChannel.subscribe((status) => {
  if (status === "SUBSCRIBED") {
    supabase.removeChannel(warmChannel);
  }
});
