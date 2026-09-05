"use client";

import { useMemo } from "react";

type Steps = { platform: string; steps: string[] };

/**
 * Setelah visitor menolak izin notifikasi, browser tidak akan pernah
 * menampilkan dialog itu lagi lewat requestPermission() — satu-satunya
 * jalan adalah lewat pengaturan situs di browser/OS masing-masing.
 * Langkahnya beda-beda dan sama sekali tidak intuitif, jadi kita tunjukkan
 * instruksi konkret sesuai perangkat yang terdeteksi, bukan cuma bilang
 * "aktifkan lewat pengaturan browser" yang bikin orang mentok.
 */
function detectSteps(): Steps {
  if (typeof navigator === "undefined") {
    return { platform: "Browser kamu", steps: genericSteps() };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  const isChrome = /Chrome|CriOS/.test(ua) && !/Edg/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isEdge = /Edg/.test(ua);

  if (isIOS) {
    return {
      platform: "iPhone / iPad",
      steps: [
        "Buka app Pengaturan (Settings) di perangkatmu.",
        "Scroll ke bawah, cari Safari (atau nama browser yang kamu pakai).",
        "Ketuk Notifications, lalu aktifkan Allow Notifications.",
        "Kembali ke halaman ini dan tekan tombol Ketuk Pintu lagi.",
      ],
    };
  }

  if (isAndroid && isChrome) {
    return {
      platform: "Android — Chrome",
      steps: [
        "Ketuk ikon gembok/info di sebelah kiri alamat website (di atas layar).",
        "Ketuk Izin (Permissions), lalu cari Notifikasi.",
        "Ubah menjadi Izinkan.",
        "Kembali ke halaman ini dan tekan tombol Ketuk Pintu lagi.",
      ],
    };
  }

  if (isAndroid) {
    return {
      platform: "Android",
      steps: [
        "Buka menu browser (titik tiga di pojok), pilih Pengaturan Situs.",
        "Cari Notifikasi, lalu pastikan situs ini diizinkan.",
        "Kembali ke halaman ini dan tekan tombol Ketuk Pintu lagi.",
      ],
    };
  }

  if (isSafari) {
    return {
      platform: "Mac — Safari",
      steps: [
        "Buka menu Safari > Settings for This Website... (atau Preferences > Websites > Notifications).",
        "Cari situs ini di daftar, lalu ubah menjadi Allow.",
        "Muat ulang halaman ini dan tekan tombol Ketuk Pintu lagi.",
      ],
    };
  }

  if (isChrome || isEdge) {
    return {
      platform: isEdge ? "Edge" : "Chrome",
      steps: [
        "Klik ikon gembok/info di sebelah kiri alamat website.",
        'Cari "Notifikasi", ubah dari Blokir menjadi Izinkan.',
        "Muat ulang halaman ini dan tekan tombol Ketuk Pintu lagi.",
      ],
    };
  }

  if (isFirefox) {
    return {
      platform: "Firefox",
      steps: [
        "Klik ikon gembok di sebelah kiri alamat website.",
        "Cari Notifikasi di daftar izin, hapus atau ubah menjadi Izinkan.",
        "Muat ulang halaman ini dan tekan tombol Ketuk Pintu lagi.",
      ],
    };
  }

  return { platform: "Browser kamu", steps: genericSteps() };
}

function genericSteps(): string[] {
  return [
    "Buka pengaturan situs untuk halaman ini lewat menu browser kamu.",
    "Cari izin Notifikasi, lalu ubah menjadi Izinkan.",
    "Muat ulang halaman ini dan tekan tombol Ketuk Pintu lagi.",
  ];
}

export function NotificationPermissionHelp({
  onClose,
  onRetry,
}: {
  onClose: () => void;
  onRetry: () => void;
}) {
  const { platform, steps } = useMemo(detectSteps, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-help-title"
    >
      <div className="w-full max-w-sm animate-rise-in rounded-t-3xl border border-void-line bg-void-raised p-6 shadow-sheet safe-bottom sm:rounded-3xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-signal-pending/15">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3C9 3 7 5.5 7 8.5V11H6a1 1 0 00-1 1v7a2 2 0 002 2h10a2 2 0 002-2v-7a1 1 0 00-1-1h-1V8.5C17 5.5 15 3 12 3zm3 8H9V8.5C9 6.6 10.3 5 12 5s3 1.6 3 3.5V11z"
              fill="#F5B942"
            />
          </svg>
        </div>

        <h2 id="notif-help-title" className="text-center text-lg font-semibold text-ink">
          Notifikasi masih dimatikan
        </h2>
        <p className="mt-1.5 text-center text-sm leading-relaxed text-ink-muted">
          Kamu pernah menolak izin notifikasi, jadi kami tidak bisa
          menanyakannya lagi otomatis. Aktifkan manual dengan langkah ini di{" "}
          {platform}:
        </p>

        <ol className="mt-4 space-y-2.5">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-haze/15 text-xs font-semibold text-haze">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="w-full rounded-2xl bg-haze py-3.5 text-sm font-semibold text-void shadow-glow-sm active:scale-[0.97]"
          >
            Sudah, coba lagi
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-center text-xs text-ink-faint underline underline-offset-2"
          >
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  );
}