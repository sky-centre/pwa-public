// Mirrors the "sky-centre" Supabase schema (public schema).
// Keep in sync with the sky-zone-android repo — this PWA only ever
// reads/writes the rows a VISITOR is allowed to touch under RLS.

export type UserRole = "OWNER" | "VISITOR";

export type ConversationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

export interface AppUser {
  id: string;
  auth_id: string | null;
  nama: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface PublicProfile {
  id: string;
  owner_id: string;
  username: string;
  foto_url: string | null;
  deskripsi: string | null;
  status_online: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  visitor_id: string;
  owner_id: string;
  status: ConversationStatus;
  keperluan: string | null;
  access_code_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  isi_pesan: string;
  status_baca: boolean;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

// Local-only shape used before a message row exists (optimistic send).
export interface PendingMessage {
  tempId: string;
  isi_pesan: string;
  created_at: string;
}
