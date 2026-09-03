"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/types";

/**
 * Ensures the current browser has an anonymous Supabase auth session and a
 * matching row in `users` (role: VISITOR). Safe to call on every page —
 * it's a no-op once a session already exists.
 */
export async function ensureVisitorSession(): Promise<AppUser> {
  const supabase = getSupabaseBrowserClient();

  const { data: existing } = await supabase.auth.getSession();
  let authId = existing.session?.user?.id ?? null;

  if (!authId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    authId = data.user?.id ?? null;
  }

  if (!authId) {
    throw new Error("Tidak bisa membuat sesi visitor anonim.");
  }

  const { data: userRow, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (userRow) return userRow as AppUser;

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({ auth_id: authId, role: "VISITOR" })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created as AppUser;
}
