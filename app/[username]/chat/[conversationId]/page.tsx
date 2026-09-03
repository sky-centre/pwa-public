"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureVisitorSession } from "@/lib/session";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatComposer } from "@/components/ChatComposer";
import { StatusBadge } from "@/components/StatusBadge";
import type { AppUser, Conversation, Message } from "@/lib/types";

type ViewState = "loading" | "ready" | "denied" | "error";

export default function ChatRoomPage() {
  const { username, conversationId } = useParams<{
    username: string;
    conversationId: string;
  }>();
  const router = useRouter();

  const [state, setState] = useState<ViewState>("loading");
  const [visitor, setVisitor] = useState<AppUser | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await ensureVisitorSession();
        const supabase = getSupabaseBrowserClient();

        const { data: convo, error: convoError } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .maybeSingle();

        if (convoError) throw convoError;
        // RLS already scopes this to the visitor's own conversation; a null
        // result here means it isn't theirs, doesn't exist, or isn't approved.
        if (!convo || convo.visitor_id !== me.id) {
          if (!cancelled) setState("denied");
          return;
        }

        const { data: msgs, error: msgError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (msgError) throw msgError;

        if (cancelled) return;
        setVisitor(me);
        setConversation(convo as Conversation);
        setMessages((msgs as Message[]) ?? []);
        setState("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Realtime: new messages + conversation status changes (e.g. owner closes chat).
  useEffect(() => {
    if (!conversation) return;
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversation.id}`,
        },
        (payload) => setConversation(payload.new as Conversation)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function handleSend(text: string) {
    if (!conversation || !visitor) return;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: visitor.id,
      isi_pesan: text,
    });
    if (error) console.error(error);
  }

  if (state === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-haze border-t-transparent" />
      </main>
    );
  }

  if (state === "denied" || state === "error") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-void px-6 text-center">
        <p className="text-lg font-semibold text-ink">
          {state === "denied" ? "Chat tidak tersedia" : "Terjadi kendala"}
        </p>
        <p className="text-sm text-ink-muted">
          {state === "denied"
            ? "Percakapan ini belum disetujui, sudah ditutup, atau bukan milikmu."
            : "Tidak bisa memuat chat ini sekarang."}
        </p>
        <button
          onClick={() => router.push(`/${username}`)}
          className="mt-2 rounded-xl border border-void-line px-4 py-2 text-sm text-ink-muted"
        >
          Kembali ke profil
        </button>
      </main>
    );
  }

  if (!conversation || !visitor) return null;

  const chatLocked = conversation.status !== "APPROVED";

  return (
    <main className="flex min-h-dvh flex-col bg-void">
      <header className="safe-top flex items-center justify-between border-b border-void-line px-4 pb-3">
        <button
          onClick={() => router.push(`/${username}`)}
          aria-label="Kembali"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted active:bg-void-raised"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink">@{username}</p>
        </div>
        <StatusBadge status={conversation.status} />
      </header>

      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <p className="pt-10 text-center text-xs text-ink-faint">
            Belum ada pesan. Mulai percakapan.
          </p>
        )}
        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            isMine={m.sender_id === visitor.id}
          />
        ))}
        {conversation.status === "CLOSED" && (
          <p className="pt-2 text-center text-xs text-ink-faint">
            Percakapan ini telah ditutup.
          </p>
        )}
      </div>

      <ChatComposer onSend={handleSend} disabled={chatLocked} />
    </main>
  );
}
