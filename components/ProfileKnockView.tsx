"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureVisitorSession } from "@/lib/session";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { KnockButton } from "@/components/KnockButton";
import { ensurePushSubscription } from "@/lib/push";
import type { AppUser, Conversation, PublicProfile } from "@/lib/types";

type ViewState = "loading" | "ready" | "not-found" | "error";

/**
 * Renders an owner's public profile + knock door flow.
 * - Pass `username` when the route is explicit (/[username]).
 * - Omit it to auto-load the single owner profile — used at "/" so the
 *   root of the PWA IS the knock flow, not a separate marketing page.
 * - `showWelcome` adds the brand mark + one directive line at the top,
 *   for the very first screen a visitor sees. It tells them what to do,
 *   not what the app is.
 */
export function ProfileKnockView({
  username,
  showWelcome,
}: {
  username?: string;
  showWelcome?: boolean;
}) {
  const router = useRouter();

  const [state, setState] = useState<ViewState>("loading");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [visitor, setVisitor] = useState<AppUser | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [keperluan, setKeperluan] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();

        const query = supabase.from("public_profile").select("*");
        const { data: profileRow, error: profileError } = username
          ? await query.eq("username", username).maybeSingle()
          : await query.order("created_at", { ascending: true }).limit(1).maybeSingle();

        if (profileError) throw profileError;
        if (!profileRow) {
          if (!cancelled) setState("not-found");
          return;
        }

        const me = await ensureVisitorSession();
        if (cancelled) return;

        const { data: existingConvo, error: convoError } = await supabase
          .from("conversations")
          .select("*")
          .eq("visitor_id", me.id)
          .eq("owner_id", profileRow.owner_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (convoError) throw convoError;

        if (cancelled) return;
        setProfile(profileRow as PublicProfile);
        setVisitor(me);
        setConversation((existingConvo as Conversation) ?? null);
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
  }, [username]);

  useEffect(() => {
    if (!conversation || conversation.status !== "PENDING") return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`conversation-status-${conversation.id}`)
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
  }, [conversation?.id, conversation?.status]);

  async function handleKnock() {
    if (!profile || !visitor) return;
    setErrorMsg(null);

    // WAJIB: izin notifikasi harus aktif SEBELUM keperluan dikirim, supaya
    // visitor benar-benar bisa menerima push begitu Sam menyetujui. Kalau
    // ditolak atau tidak didukung browser, pengiriman diblokir di sini.
    const pushResult = await ensurePushSubscription(visitor.id);
    if (!pushResult.ok) {
      if (pushResult.reason === "denied") {
        setErrorMsg(
          "Izinkan notifikasi dulu, ya — supaya kamu langsung tahu saat Sam menyetujui ketukanmu."
        );
      } else if (pushResult.reason === "unsupported") {
        setErrorMsg(
          "Browser ini belum mendukung notifikasi. Coba pakai Chrome/Edge/Safari versi terbaru."
        );
      } else {
        setErrorMsg("Gagal mengaktifkan notifikasi. Coba lagi sebentar lagi.");
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const trimmedCode = accessCode.trim();
    const basePayload = {
      visitor_id: visitor.id,
      owner_id: profile.owner_id,
      keperluan: keperluan.trim() || null,
    };

    try {
      if (trimmedCode) {
        // Try to skip the approval queue: the conversations_insert_participant
        // RLS policy only allows status APPROVED when access_code_used matches
        // a valid, active, unexpired, not-yet-exhausted code for this owner.
        // We can't validate the code ourselves ahead of time (RLS is the
        // source of truth), so we attempt it and fall back to a normal
        // PENDING knock if it's rejected.
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            ...basePayload,
            status: "APPROVED",
            access_code_used: trimmedCode,
          })
          .select("*")
          .single();

        if (!error) {
          setConversation(data as Conversation);
          return;
        }

        // RLS violation (invalid/expired/exhausted code) — fall back to a
        // regular knock below instead of surfacing an error, since an
        // unrecognized code shouldn't block the visitor from knocking.
        console.warn("Kode akses tidak valid, lanjut sebagai ketukan biasa.", error);
      }

      const { data, error } = await supabase
        .from("conversations")
        .insert(basePayload)
        .select("*")
        .single();

      if (error) throw error;
      setConversation(data as Conversation);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengetuk pintu. Coba lagi sebentar lagi.");
    }
  }

  if (state === "loading") {
    return (
      <main className="zone-backdrop flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-haze border-t-transparent" />
      </main>
    );
  }

  if (state === "not-found") {
    return (
      <main className="zone-backdrop flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center safe-top safe-bottom">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-void-line bg-void-raised">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
              stroke="#5B6472"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M9.5 12l2 2 3.5-4" stroke="#5B6472" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-ink">Zona tidak ditemukan</p>
        <p className="text-sm text-ink-muted">
          {username
            ? `Username "${username}" tidak terdaftar di Sam-Zone.`
            : "Profil pemilik belum tersedia."}
        </p>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="zone-backdrop flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center safe-top safe-bottom">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-void-line bg-void-raised">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3C9 3 7 5.5 7 8.5V11H6a1 1 0 00-1 1v7a2 2 0 002 2h10a2 2 0 002-2v-7a1 1 0 00-1-1h-1V8.5C17 5.5 15 3 12 3zm3 8H9V8.5C9 6.6 10.3 5 12 5s3 1.6 3 3.5V11z"
              fill="#5B6472"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-ink">Terjadi kendala</p>
        <p className="text-sm text-ink-muted">
          Tidak bisa memuat profil ini sekarang. Muat ulang halaman.
        </p>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="zone-backdrop flex min-h-dvh flex-col px-6 safe-top safe-bottom">
      <div className="flex flex-1 flex-col items-center justify-center">
        {showWelcome && (
          <div className="mb-6 w-full max-w-[240px] animate-rise-in">
            <Image
              src="/logo/sam-zone-hero.png"
              alt="Selamat datang di Sam-Zone — Public Chat"
              width={719}
              height={575}
              priority
              className="h-auto w-full object-contain drop-shadow-[0_0_28px_rgba(56,189,248,0.28)]"
            />
            <p className="mt-1 text-center text-xs leading-relaxed text-ink-muted">
              Tulis keperluanmu, ketuk pintu — chat terbuka otomatis begitu
              Sam menyetujui.
            </p>
          </div>
        )}

        <Avatar
          src={profile.foto_url}
          alt={profile.username}
          online={profile.status_online}
          size={showWelcome ? 88 : 120}
        />
        <h1 className="mt-4 text-xl font-semibold text-ink">
          @{profile.username}
        </h1>
        {profile.deskripsi && (
          <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-ink-muted">
            {profile.deskripsi}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-void-line bg-void-raised px-3 py-1 text-xs text-ink-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              profile.status_online ? "bg-signal-approved" : "bg-ink-faint"
            }`}
          />
          {profile.status_online ? "Sedang berjaga" : "Sedang tidak ada"}
        </span>

        {conversation && (
          <div className="mt-5">
            <StatusBadge status={conversation.status} />
          </div>
        )}
      </div>

      <div className="pb-8">
        {!conversation && (
          <div className="relative animate-rise-in space-y-3 rounded-3xl border border-void-line bg-void-raised/60 p-4 pt-5 backdrop-blur-sm">
            {/* Light seeping in under the door — the one structural flourish on this card */}
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-haze/70 to-transparent" />

            <textarea
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              placeholder="Tulis keperluanmu singkat (opsional) — membantu Sam memutuskan lebih cepat"
              rows={2}
              className="w-full resize-none rounded-2xl border border-void-line bg-void/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-haze/60"
            />

            {showAccessCode ? (
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Kode akses"
                className="w-full rounded-2xl border border-void-line bg-void/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-haze/60"
              />
            ) : (
              <button
                onClick={() => setShowAccessCode(true)}
                className="text-xs text-ink-faint underline underline-offset-2"
              >
                Punya kode akses?
              </button>
            )}

            {errorMsg && (
              <p className="text-xs text-signal-rejected">{errorMsg}</p>
            )}

            <KnockButton onKnock={handleKnock} />
          </div>
        )}

        {conversation?.status === "PENDING" && (
          <p className="pt-4 text-center text-xs text-ink-faint">
            Sam akan meninjau ketukanmu. Halaman ini akan otomatis terupdate.
          </p>
        )}

        {conversation?.status === "APPROVED" && (
          <button
            onClick={() =>
              router.push(`/${profile.username}/chat/${conversation.id}`)
            }
            className="w-full rounded-2xl bg-haze py-4 text-base font-semibold text-void shadow-glow active:scale-[0.97]"
          >
            Buka Chat
          </button>
        )}

        {conversation?.status === "REJECTED" && (
          <p className="text-center text-sm text-ink-muted">
            Ketukanmu belum disetujui kali ini.
          </p>
        )}

        {conversation?.status === "CLOSED" && (
          <p className="text-center text-sm text-ink-muted">
            Percakapan ini sudah ditutup oleh Sam.
          </p>
        )}
      </div>
    </main>
  );
}