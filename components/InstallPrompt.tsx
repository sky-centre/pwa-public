"use client";

import { useInstallPrompt } from "@/components/useInstallPrompt";
import { useEffect, useState } from "react";

function InstallPromptComponent() {
  const { isInstallable, install } = useInstallPrompt();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  if (!visible || !isInstallable) {
    return null;
  }

  return (
    <div
      className="
        fixed
        bottom-5
        left-1/2
        z-50
        -translate-x-1/2
        w-[90%]
        max-w-sm
        rounded-2xl
        bg-slate-900
        p-4
        shadow-2xl
        border
        border-slate-700
      "
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Install Sky Zone App
          </h3>

          <p className="mt-1 text-xs text-slate-300">
            Pasang aplikasi agar akses lebih cepat seperti aplikasi native.
          </p>
        </div>

        <button
          onClick={install}
          className="
            rounded-xl
            bg-blue-600
            px-4
            py-2
            text-xs
            font-semibold
            text-white
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
