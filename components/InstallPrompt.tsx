"use client";

import { useInstallPrompt } from "@/components/useInstallPrompt";
import { useEffect, useState } from "react";

function InstallPromptComponent() {
  const {
    canInstall,
    promptInstall,
  } = useInstallPrompt();

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  if (!visible || !canInstall || dismissed) {
    return null;
  }

  return (
    <div
      className="
        fixed
        top-24
        left-0
        z-50
        w-[85%]
        max-w-xs
        animate-in
        slide-in-from-left
        duration-300
      "
    >
      <div
        className="
          relative
          rounded-r-2xl
          bg-slate-900
          p-4
          pr-8
          pl-5
          shadow-2xl
          border
          border-l-0
          border-slate-700
        "
        style={{
          // efek "bendera" menempel di tepi kiri layar
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 3% 50%)",
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          aria-label="Tutup"
          className="
            absolute
            top-2
            right-2
            flex
            h-5
            w-5
            items-center
            justify-center
            rounded-full
            text-slate-400
            hover:text-white
            hover:bg-slate-700
            transition
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h3 className="text-sm font-semibold text-white">
          Install Sky Zone App
        </h3>

        <p className="mt-1 text-xs text-slate-300">
          Pasang aplikasi agar akses lebih cepat seperti aplikasi native.
        </p>

        <button
          onClick={promptInstall}
          className="
            mt-3
            w-full
            rounded-xl
            bg-blue-600
            px-4
            py-2
            text-xs
            font-semibold
            text-white
            hover:bg-blue-700
            transition
          "
        >
          Install
        </button>
      </div>
    </div>
  );
}

export const InstallPrompt = InstallPromptComponent;

export default InstallPromptComponent;
