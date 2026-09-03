"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureVisitorSession } from "@/lib/session";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { KnockButton } from "@/components/KnockButton";
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
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          visitor_id: visitor.id,
          owner_id: profile.owner_id,
          keperluan: keperluan.trim() || null,
          access_code_used: accessCode.trim() || null,
        })
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
      <main className="flex min-h-dvh items-center justify-center bg-void">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-haze border-t-transparent" />
      </main>
    );
  }

  if (state === "not-found") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-void px-6 text-center">
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
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-void px-6 text-center">
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
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative h-16 w-16">
              <Image
                src="/logo/sam-zone-icon.png"
                alt="Sam-Zone"
                fill
                priority
                className="object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.35)]"
              />
            </div>
            <p className="mt-3 font-mark text-2xl leading-none text-ink">
              Selamat datang di <span className="text-haze">Sam&#8209;Zone</span>
            </p>
            <p className="mt-2 max-w-[15rem] text-xs leading-relaxed text-ink-muted">
              Tulis keperluanmu, lalu ketuk pintu. Sam meninjau dan chat
              terbuka otomatis begitu disetujui.
            </p>
          </div>
        )}

        <Avatar
          src={profile.foto_url}
          alt={profile.username}
          online={profile.status_online}
          size={112}
        />
        <h1 className="mt-4 text-xl font-semibold text-ink">
          @{profile.username}
        </h1>
        {profile.deskripsi && (
          <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-ink-muted">
            {profile.deskripsi}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          {profile.status_online ? "Sedang online" : "Sedang offline"}
        </p>

        {conversation && (
          <div className="mt-5">
            <StatusBadge status={conversation.status} />
          </div>
        )}
      </div>

      <div className="pb-8">
        {!conversation && (
          <div className="space-y-3">
            <textarea
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              placeholder="Tulis keperluanmu singkat (opsional) — membantu Sam memutuskan lebih cepat"
              rows={2}
              className="w-full resize-none rounded-2xl border border-void-line bg-void-raised px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-haze/60"
            />

            {showAccessCode ? (
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Kode akses"
                className="w-full rounded-2xl border border-void-line bg-void-raised px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-haze/60"
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
