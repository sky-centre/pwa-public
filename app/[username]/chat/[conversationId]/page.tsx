"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureVisitorSession } from "@/lib/session";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatComposer } from "@/components/ChatComposer";
import { StatusBadge } from "@/components/StatusBadge";
import { NotificationPermissionHelp } from "@/components/NotificationPermissionHelp";
import {
  ensurePushSubscription,
  getNotificationPermissionState,
} from "@/lib/push";
import { markDelivered, markRead, getTickStatus } from "@/lib/messageStatus";
import type {
  AppUser,
  Conversation,
  ConversationStatus,
  Message,
} from "@/lib/types";

type ViewState = "loading" | "ready" | "denied" | "error";

// Selaras dengan copy di StatusBadge.tsx: status non-APPROVED mengunci
// composer, jadi setiap status itu (bukan cuma CLOSED) perlu keterangan
// kenapa input tidak bisa dipakai.
const LOCK_NOTICE: Partial<Record<ConversationStatus, string>> = {
  PENDING: "Menunggu persetujuan sebelum bisa membalas.",
  REJECTED: "Permintaan chat ini tidak disetujui.",
  CLOSED: "Percakapan ini telah ditutup.",
};

// Font berbeda khusus untuk handle "@username" di header — sengaja dipisah
// dari font utama app supaya identitas Sam menonjol di titik yang paling
// sering dilihat (header selalu ada di layar).
const handleFont = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"] });

// Sama dengan READ_TICK_COLOR di ChatBubble.tsx — dipakai lagi di sini
// supaya biru tosca jadi warna aksen yang konsisten, bukan warna sekali pakai.
const ACCENT_TURQUOISE = "#2DD4BF";

type NotifStatus = "granted" | "denied" | "prompt" | "unsupported" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Ring fokus keyboard yang konsisten dipakai di semua tombol interaktif —
// disatukan jadi satu konstanta supaya tidak ada tombol yang "lupa" diberi
// state fokus (a11y).
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-void";

/** Inisial dari @username, dipakai sebagai monogram avatar di header. */
function getInitials(name: string) {
  const clean = name.trim();
  if (!clean) return "?";
  return clean.slice(0, 2).toUpperCase();
}

function BellIcon({ status }: { status: NotifStatus }) {
  const color = status === "granted" ? "#34D399" : "#F5B942";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4a5 5 0 0 0-5 5v2.3c0 1-.32 1.98-.9 2.79L5 16h14l-1.1-1.91a4.9 4.9 0 0 1-.9-2.79V9a5 5 0 0 0-5-5Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 18.5a2.5 2.5 0 0 0 5 0"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {status === "granted" && <circle cx="18.2" cy="5.8" r="2.6" fill={color} />}
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M12 6.2v5.6m0 0 2.4-2.4M12 11.8 9.6 9.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 14.2v2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5 21 19H3L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 10v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16.3" r="0.9" fill="currentColor" />
    </svg>
  );
}

/**
 * Instruksi manual untuk "install ke perangkat" saat `beforeinstallprompt`
 * tidak tersedia — ini SELALU kasusnya di Safari/iOS (event itu memang
 * tidak pernah ada di sana), dan juga muncul kalau app sudah pernah
 * ter-install. Modal ini menggantikan tombol yang diam saja tanpa efek.
 */
function InstallHelpModal({
  isIOS,
  onClose,
}: {
  isIOS: boolean;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-help-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
    >
      <div className="w-full max-w-sm rounded-t-3xl border border-void-line bg-void-raised p-5 sm:rounded-3xl">
        <p id="install-help-title" className="text-sm font-semibold text-ink">
          Install ke perangkat
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {isIOS ? (
            <>
              Di Safari, tap ikon <strong>Share</strong> (kotak dengan panah ke
              atas) di bar bawah, lalu pilih{" "}
              <strong>&quot;Add to Home Screen&quot;</strong>.
            </>
          ) : (
            <>
              Buka menu browser (ikon titik tiga di pojok), lalu pilih{" "}
              <strong>&quot;Install app&quot;</strong> atau{" "}
              <strong>&quot;Add to Home screen&quot;</strong>.
            </>
          )}
        </p>
        <button
          onClick={onClose}
          className={`mt-4 w-full rounded-xl border border-void-line py-2.5 text-sm font-medium text-ink-muted transition-colors active:bg-void ${FOCUS_RING}`}
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}

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

  // --- Notifikasi (tombol di header) ---
  const [notifStatus, setNotifStatus] = useState<NotifStatus>(null);
  const [notifBusy, setNotifBusy] = useState(false);
  const [showNotifHelp, setShowNotifHelp] = useState(false);

  // --- Install ke perangkat (tombol di header) ---
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setNotifStatus(getNotificationPermissionState());

    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstallEvent(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function handleEnableNotifications() {
    if (!visitor || notifBusy) return;

    if (notifStatus === "denied") {
      setShowNotifHelp(true);
      return;
    }

    setNotifBusy(true);
    const result = await ensurePushSubscription(visitor.id);
    setNotifBusy(false);

    if (result.ok) {
      setNotifStatus("granted");
      return;
    }
    if (result.reason === "denied" || result.reason === "blocked") {
      setNotifStatus("denied");
      setShowNotifHelp(true);
    } else if (result.reason === "unsupported") {
      setNotifStatus("unsupported");
    }
    // kegagalan lain: diam saja di sini, tombol tetap bisa dicoba ulang.
  }

  async function handleInstallTap() {
    if (!installEvent) {
      setShowInstallHelp(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
    }
  }

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
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          // Sinkronkan perubahan delivered_at/read_at (mis. Sam sudah
          // membaca pesan kita) supaya ceklis di bubble ikut berubah live.
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
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

  // Layar chat ini sedang terbuka/aktif -> anggap semua pesan dari Sam yang
  // terlihat di sini sebagai delivered + read. Jalan tiap kali daftar pesan
  // berubah (pesan baru masuk, atau load pertama kali).
  useEffect(() => {
    if (!conversation || !visitor || messages.length === 0) return;
    markDelivered(conversation.id, visitor.id);
    markRead(conversation.id, visitor.id);
  }, [messages, conversation, visitor]);

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
        <div
          role="status"
          aria-live="polite"
          aria-label="Memuat percakapan"
          className="h-7 w-7 animate-spin rounded-full border-2 border-haze border-t-transparent"
        />
      </main>
    );
  }

  if (state === "denied" || state === "error") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-void px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-void-line bg-void-raised text-ink-muted">
          {state === "denied" ? <LockIcon /> : <AlertIcon />}
        </div>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-ink">
            {state === "denied" ? "Chat tidak tersedia" : "Terjadi kendala"}
          </p>
          <p className="max-w-[26ch] text-sm text-ink-muted">
            {state === "denied"
              ? "Percakapan ini belum disetujui, sudah ditutup, atau bukan milikmu."
              : "Tidak bisa memuat chat ini sekarang."}
          </p>
        </div>
        <button
          onClick={() => router.push(`/${username}`)}
          className={`mt-1 rounded-xl border border-void-line px-4 py-2 text-sm text-ink-muted transition-colors active:bg-void-raised ${FOCUS_RING}`}
        >
          Kembali ke profil
        </button>
      </main>
    );
  }

  if (!conversation || !visitor) return null;

  const chatLocked = conversation.status !== "APPROVED";
  const bellDim = notifBusy || notifStatus === "unsupported";

  return (
    <main className="flex min-h-dvh flex-col bg-void">
      <header className="safe-top motion-safe:animate-rise-in px-4 pb-1 pt-3">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-4 pb-5 pt-1 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.push(`/${username}`)}
            aria-label="Kembali"
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors active:bg-white/10 ${FOCUS_RING}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handleEnableNotifications}
              disabled={notifBusy || notifStatus === "granted" || notifStatus === "unsupported"}
              aria-label={
                notifStatus === "granted" ? "Notifikasi aktif" : "Aktifkan notifikasi"
              }
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors active:bg-white/10 disabled:active:bg-white/5 ${
                bellDim ? "opacity-40" : "opacity-100"
              } ${FOCUS_RING}`}
            >
              <BellIcon status={notifStatus} />
            </button>
            {!isStandalone && (
              <button
                onClick={handleInstallTap}
                aria-label="Install ke perangkat"
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors active:bg-white/10 ${FOCUS_RING}`}
              >
                <InstallIcon />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col items-center gap-2">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] text-base font-semibold"
            style={{
              borderColor: `${ACCENT_TURQUOISE}73`,
              backgroundColor: `${ACCENT_TURQUOISE}1A`,
              color: ACCENT_TURQUOISE,
              boxShadow: `0 0 26px ${ACCENT_TURQUOISE}47, inset 0 0 14px ${ACCENT_TURQUOISE}1F`,
            }}
            aria-hidden="true"
          >
            <span className={handleFont.className}>{getInitials(username)}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p
              className={`${handleFont.className} text-xl font-bold tracking-tight`}
              style={{
                color: ACCENT_TURQUOISE,
                textShadow: `0 0 22px ${ACCENT_TURQUOISE}59`,
              }}
            >
              @{username}
            </p>
            <StatusBadge status={conversation.status} />
          </div>
        </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-4 py-5"
      >
        {messages.length === 0 && (
          <p className="mx-auto max-w-[24ch] pt-10 text-center text-xs text-ink-faint">
            Belum ada pesan. Kirim pesan pertama untuk memulai percakapan.
          </p>
        )}
        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            isMine={m.sender_id === visitor.id}
            tickStatus={getTickStatus(m, visitor.id)}
          />
        ))}
        {chatLocked && LOCK_NOTICE[conversation.status] && (
          <p className="pt-2 text-center text-xs text-ink-faint">
            {LOCK_NOTICE[conversation.status]}
          </p>
        )}
      </div>

      <ChatComposer onSend={handleSend} disabled={chatLocked} />

      {showNotifHelp && (
        <NotificationPermissionHelp
          onClose={() => setShowNotifHelp(false)}
          onRetry={() => {
            setShowNotifHelp(false);
            handleEnableNotifications();
          }}
        />
      )}

      {showInstallHelp && (
        <InstallHelpModal isIOS={isIOS} onClose={() => setShowInstallHelp(false)} />
      )}
    </main>
  );
}
