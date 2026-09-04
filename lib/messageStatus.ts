"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

export type TickStatus = "sent" | "delivered" | "read" | null;

/**
 * Tandai semua pesan dari LAWAN BICARA (bukan `myUserId`) di percakapan ini
 * sebagai delivered, kalau belum. Aman dipanggil berkali-kali.
 */
export async function markDelivered(conversationId: string, myUserId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("messages")
    .update({ delivered_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", myUserId)
    .is("delivered_at", null);

  if (error) console.warn("Gagal menandai delivered:", error.message);
}

/**
 * Tandai semua pesan dari LAWAN BICARA di percakapan ini sebagai read,
 * kalau belum. Panggil ini saat layar chat sedang terbuka/aktif.
 */
export async function markRead(conversationId: string, myUserId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", myUserId)
    .is("read_at", null);

  if (error) console.warn("Gagal menandai read:", error.message);
}

/**
 * Status ceklis untuk SATU pesan, dari sudut pandang `myUserId`.
 * Return null kalau pesan itu bukan dikirim oleh saya (tidak perlu ceklis).
 */
export function getTickStatus(
  message: Pick<Message, "sender_id" | "delivered_at" | "read_at">,
  myUserId: string
): TickStatus {
  if (message.sender_id !== myUserId) return null;
  if (message.read_at) return "read";
  if (message.delivered_at) return "delivered";
  return "sent";
}
