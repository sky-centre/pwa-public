"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "blocked" | "error" };

/**
 * Baca status izin notifikasi TANPA memicu prompt apa pun.
 * Dipakai untuk membedakan dua kasus yang sering ketuker:
 * - "prompt"/"default": belum pernah ditanya -> requestPermission() masih
 *   akan menampilkan dialog asli browser.
 * - "denied": visitor SUDAH pernah menolak sebelumnya. Di semua browser
 *   modern, memanggil requestPermission() lagi TIDAK menampilkan dialog
 *   apa pun — ia langsung resolve ke "denied" secara diam-diam. Kalau kita
 *   tetap memanggilnya di sini, visitor akan menekan tombol berkali-kali
 *   tanpa ada yang terjadi sama sekali, dan mengira aplikasinya rusak.
 *   Kasus ini harus diarahkan ke instruksi manual (lihat
 *   NotificationPermissionHelp), bukan ke requestPermission() lagi.
 */
export function getNotificationPermissionState():
  | "unsupported"
  | "granted"
  | "denied"
  | "prompt" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "default") return "prompt";
  return Notification.permission;
}

/**
 * WAJIB dipanggil sebelum visitor mengirim keperluan (ketuk pintu).
 *
 * Alurnya:
 * 1. Kalau permission browser sudah "denied" dari percobaan sebelumnya,
 *    JANGAN panggil requestPermission() lagi (lihat penjelasan di
 *    getNotificationPermissionState) -> langsung return reason "blocked"
 *    supaya UI bisa menampilkan instruksi cara mengaktifkan manual.
 * 2. Kalau belum pernah ditanya, minta izin (Notification.requestPermission).
 *    Kalau ditolak di sini -> return "denied" (baru saja ditolak).
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

  // Sudah pernah ditolak sebelumnya -> jangan panggil requestPermission()
  // lagi, browser tidak akan menampilkan apa-apa. Arahkan ke instruksi manual.
  if (Notification.permission === "denied") {
    return { ok: false, reason: "blocked" };
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