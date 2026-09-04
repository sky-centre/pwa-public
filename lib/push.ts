"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushPermissionResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "error" };

/**
 * WAJIB dipanggil sebelum visitor mengirim keperluan (ketuk pintu).
 *
 * Alurnya:
 * 1. Minta izin notifikasi browser (Notification.requestPermission).
 * 2. Kalau ditolak -> return denied, caller HARUS memblokir pengiriman.
 * 3. Kalau diizinkan -> subscribe ke Web Push, simpan subscription ke
 *    tabel `devices` (upsert, aman dipanggil berkali-kali).
 *
 * Ini penting dilakukan SEBELUM insert `conversations`, karena Edge
 * Function `notify-approval` butuh subscription ini sudah ada saat Sam
 * approve — kalau baru diminta setelah approve, sudah terlambat.
 */
export async function ensurePushSubscription(
  userId: string
): Promise<PushPermissionResult> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return { ok: false, reason: "unsupported" };
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY belum diset — cek .env.local");
    return { ok: false, reason: "unsupported" };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }

    // Daftarkan service worker di sini secara eksplisit (tidak bergantung
    // pada ServiceWorkerRegister yang hanya jalan di production), supaya
    // fitur ini juga bisa dites saat development.
    await navigator.serviceWorker.register("/sw.js");
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("devices").upsert(
      {
        user_id: userId,
        notification_token: JSON.stringify(subscription.toJSON()),
        device_info: navigator.userAgent,
      },
      { onConflict: "user_id,notification_token" }
    );

    if (error) throw error;

    return { ok: true };
  } catch (err) {
    console.error("Gagal mengaktifkan push notification:", err);
    return { ok: false, reason: "error" };
  }
}
