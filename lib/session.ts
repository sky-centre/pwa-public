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

  // The `handle_new_auth_user` trigger (see migration
  // sky_zone_auto_create_user_on_auth) already creates the matching
  // public.users row — with a safe fallback for the NOT NULL `nama`
  // column — every time a row is inserted into auth.users, including
  // anonymous sign-ins. We must NOT insert here ourselves: `nama` has
  // no default at the table level, so a manual insert without it
  // fails with `null value in column "nama" violates not-null
  // constraint`, and duplicate inserts would collide with the
  // `auth_id` unique constraint besides.
  //
  // The only thing we need to handle client-side is the brief window
  // between the auth session being created and the trigger's insert
  // becoming visible to this client, so we retry the SELECT a few
  // times with a short backoff instead of racing it with our own
  // insert.
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: userRow, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (userRow) return userRow as AppUser;

    // Row not visible yet — the trigger may not have committed.
    // Wait briefly and retry rather than inserting manually.
    await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
  }

  throw new Error(
    "Sesi visitor belum siap. Coba muat ulang halaman dalam beberapa saat."
  );
}
