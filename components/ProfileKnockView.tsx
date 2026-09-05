"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureVisitorSession } from "@/lib/session";
import Image from "next/image";
import { StatusBadge } from "@/components/StatusBadge";
import { KnockButton } from "@/components/KnockButton";
import { NotificationPermissionHelp } from "@/components/NotificationPermissionHelp";
import {
  ensurePushSubscription,
  getNotificationPermissionState,
} from "@/lib/push";
import type { AppUser, Conversation, PublicProfile } from "@/lib/types";

type ViewState = "loading" | "ready" | "not-found" | "error";

// Warna latar diambil langsung dari sampel piksel logo (sam-zone-hero.png),
// supaya transisi antara logo dan background halaman terlihat menyatu.
const ZONE_BG_COLOR = "#09090B";

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
  const [visitorName, setVisitorName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Peringatan non-blocking: browser sudah menolak izin notifikasi secara
  // permanen (requestPermission tidak akan prompt ulang), tapi visitor masih
  // boleh lanjut mengetuk pintu. Dipisah dari errorMsg supaya tetap tampil
  // walau status conversation sudah berubah jadi PENDING/APPROVED.
  const [pushWarning, setPushWarning] = useState<string | null>(null);

  // Tombol notifikasi mandiri di halaman awal — terpisah dari alur ketuk
  // pintu, supaya visitor bisa mengaktifkan notifikasi kapan saja tanpa
  // harus mengisi nama & mengetuk dulu.
  // notifStatus mulai dari null (belum dicek) supaya render pertama sama
  // persis antara server & client, lalu diisi di useEffect setelah mount
  // (Notification API hanya ada di window, tidak ada saat SSR).
  const [notifStatus, setNotifStatus] = useState<
    "granted" | "denied" | "prompt" | "unsupported" | null
  >(null);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);
  const [showNotifHelp, setShowNotifHelp] = useState(false);

  useEffect(() => {
    setNotifStatus(getNotificationPermissionState());
  }, []);

  async function handleEnableNotifications() {
    if (!visitor || notifBusy) return;

    // Sudah pernah ditolak sebelumnya -> requestPermission() tidak akan
    // menampilkan dialog apa pun (lihat catatan di lib/push.ts). Arahkan
    // langsung ke instruksi manual alih-alih menekan tombol tanpa efek.
    if (notifStatus === "denied") {
      setShowNotifHelp(true);
      return;
    }

    setNotifBusy(true);
    setNotifMessage(null);

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
      setNotifMessage("Browser ini belum mendukung notifikasi.");
    } else {
      setNotifMessage("Gagal mengaktifkan notifikasi. Coba lagi sebentar lagi.");
    }
  }

  const trimmedName = visitorName.trim();
  const isNameValid = trimmedName.length > 0;

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
    if (!isNameValid) return; // guard tambahan; tombol sudah disabled di UI

    setErrorMsg(null);

    setPushWarning(null);

    // Izin notifikasi diusahakan aktif SEBELUM keperluan dikirim, supaya
    // visitor bisa menerima push begitu Sam menyetujui. Tapi kalau browser
    // sudah menolaknya (status "denied" bersifat permanen — requestPermission
    // tidak akan menampilkan prompt lagi sampai visitor mereset izin manual
    // di pengaturan situs), kita tidak boleh mengunci visitor dari fitur
    // utama hanya karena satu klik "Block" yang mungkin tidak disengaja.
    // Jadi: tetap lanjut ketuk pintu, cukup beri peringatan non-blocking.
    const pushResult = await ensurePushSubscription(visitor.id);
    if (!pushResult.ok) {
      if (pushResult.reason === "denied") {
        setPushWarning(
          "Notifikasi diblokir di browser kamu, jadi kamu mungkin tidak dapat pemberitahuan otomatis saat Sam menyetujui. Cek halaman ini sesekali, atau aktifkan notifikasi lewat pengaturan situs (ikon gembok/info di address bar) lalu ketuk ulang."
        );
        // sengaja tidak return — lanjut proses knock di bawah
      } else if (pushResult.reason === "unsupported") {
        setErrorMsg(
          "Browser ini belum mendukung notifikasi. Coba pakai Chrome/Edge/Safari versi terbaru."
        );
        return;
      } else {
        setErrorMsg("Gagal mengaktifkan notifikasi. Coba lagi sebentar lagi.");
        return;
      }
    }

    const supabase = getSupabaseBrowserClient();
    const trimmedCode = accessCode.trim();
    const basePayload = {
      visitor_id: visitor.id,
      owner_id: profile.owner_id,
      keperluan: null,
    };

    try {
      // Simpan nama ke kolom `users.nama` yang sudah ada di skema —
      // tidak perlu migrasi/kolom baru. Dilakukan sebelum insert
      // conversation supaya nama visitor sudah terekam begitu Sam
      // melihat notifikasi ketukan.
      const { error: nameError } = await supabase
        .from("users")
        .update({ nama: trimmedName })
        .eq("id", visitor.id);

      if (nameError) throw nameError;

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
      <main
        className="zone-backdrop flex min-h-dvh items-center justify-center"
        style={{ backgroundColor: ZONE_BG_COLOR }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-haze border-t-transparent" />
      </main>
    );
  }

  if (state === "not-found") {
    return (
      <main
        className="zone-backdrop flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center safe-top safe-bottom"
        style={{ backgroundColor: ZONE_BG_COLOR }}
      >
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
      <main
        className="zone-backdrop flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center safe-top safe-bottom"
        style={{ backgroundColor: ZONE_BG_COLOR }}
      >
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
    <main
      className="zone-backdrop flex min-h-dvh flex-col px-6 safe-top safe-bottom"
      style={{ backgroundColor: ZONE_BG_COLOR }}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        {showWelcome && (
          <div className="mb-6 w-full max-w-[340px] animate-rise-in">
            <Image
              src="/logo/sam-zone-hero.png"
              alt="Selamat datang di Sam-Zone — Public Chat"
              width={719}
              height={575}
              priority
              className="h-auto w-full object-contain drop-shadow-[0_0_28px_rgba(56,189,248,0.28)]"
            />
            <p className="mt-1 text-center text-xs leading-relaxed text-ink-muted">
              Ketuk pintu — chat terbuka otomatis begitu Sam menyetujui.
            </p>
          </div>
        )}

        {/* Avatar bulat dihapus — sebelumnya menampilkan icon fallback
            generik saat foto_url kosong. Identitas Sam cukup diwakili
            oleh logo + username di bawah ini. */}
        <h1 className="mt-2 text-xl font-semibold text-ink">
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

        {visitor && notifStatus !== "unsupported" && (
          <button
            onClick={handleEnableNotifications}
            disabled={notifBusy || notifStatus === "granted" || notifStatus === null}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-void-line bg-void-raised px-3.5 py-1.5 text-xs font-medium text-ink-muted transition active:scale-[0.97] disabled:active:scale-100"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3C9 3 7 5.5 7 8.5V11H6a1 1 0 00-1 1v7a2 2 0 002 2h10a2 2 0 002-2v-7a1 1 0 00-1-1h-1V8.5C17 5.5 15 3 12 3zm3 8H9V8.5C9 6.6 10.3 5 12 5s3 1.6 3 3.5V11z"
                fill={notifStatus === "granted" ? "#34D399" : "#F5B942"}
              />
            </svg>
            {notifStatus === "granted"
              ? "Notifikasi aktif"
              : notifBusy
                ? "Memproses…"
                : "Aktifkan Notifikasi"}
          </button>
        )}

        {notifMessage && (
          <p className="mt-2 max-w-xs text-center text-xs text-signal-rejected">
            {notifMessage}
          </p>
        )}

        {conversation && (
          <div className="mt-5">
            <StatusBadge status={conversation.status} />
          </div>
        )}

        {pushWarning && (
          <p className="mt-3 max-w-xs text-center text-xs text-signal-rejected">
            {pushWarning}
          </p>
        )}
      </div>

      <div className="pb-8">
        {!conversation && (
          <div className="relative animate-rise-in space-y-3 rounded-3xl border border-void-line bg-void-raised/60 p-4 pt-5 backdrop-blur-sm">
            {/* Light seeping in under the door — the one structural flourish on this card */}
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-haze/70 to-transparent" />

            <input
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Nama kamu"
              className="w-full rounded-2xl border border-void-line bg-void/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-haze/60"
            />

            {showAccessCode && (
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Kode akses"
                className="w-full rounded-2xl border border-void-line bg-void/70 px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-haze/60"
              />
            )}

            {errorMsg && (
              <p className="text-xs text-signal-rejected">{errorMsg}</p>
            )}

            <KnockButton onKnock={handleKnock} disabled={!isNameValid} />

            {!showAccessCode && (
              <button
                onClick={() => setShowAccessCode(true)}
                className="block w-full text-center text-xs text-ink-faint underline underline-offset-2"
              >
                Punya kode akses?
              </button>
            )}
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

      {showNotifHelp && (
        <NotificationPermissionHelp
          onClose={() => setShowNotifHelp(false)}
          onRetry={() => {
            setShowNotifHelp(false);
            handleEnableNotifications();
          }}
        />
      )}
    </main>
  );
}
