"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Fails loud in dev rather than silently returning a broken client.
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — check your .env.local"
  );
}

let browserClient: SupabaseClient | null = null;

// Publishable/anon key is safe in a public visitor app by design —
// every table is protected by RLS, not by hiding this key.
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "sky-zone-visitor-auth",
      },
    });
  }
  return browserClient;
}
