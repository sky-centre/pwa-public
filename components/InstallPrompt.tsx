"use client";

import { useEffect, useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

const DISMISSED_KEY = "sky-zone-install-dismissed";

export function InstallPrompt() {
  const { canInstall, isStandalone, promptInstall } = useInstallPrompt();
  // Mulai dari true (tersembunyi) supaya render pertama sama antara server &
  // client — localStorage cuma ada di browser, dibaca setelah mount.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(!!localStorage.getItem(DISMISSED_KEY));
  }, []);

  const visible = canInstall && !isStandalone && !dismissed;
  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    await promptInstall();
    // Kalau outcome "dismissed" (user menutup dialog native), banner ini
    // akan hilang sendiri di render berikutnya karena canInstall jadi false
    // hanya saat "accepted" — kalau ditolak, deferred tetap ada dan banner
    // tetap tampil supaya user bisa coba lagi kapan saja.
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 animate-rise-in rounded-2xl border border-void-line bg-void-raised p-4 shadow-sheet">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-haze/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"
              stroke="#38BDF8"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Pasang Sam-Zone</p>
          <p className="text-xs text-ink-muted">
            Akses lebih cepat langsung dari layar utama.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={dismiss}
          className="flex-1 rounded-xl border border-void-line py-2 text-sm text-ink-muted"
        >
          Nanti saja
        </button>
        <button
          onClick={install}
          className="flex-1 rounded-xl bg-haze py-2 text-sm font-semibold text-void"
        >
          Pasang
        </button>
      </div>
    </div>
  );
}
