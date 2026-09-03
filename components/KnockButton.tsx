"use client";

import { useState } from "react";

export function KnockButton({
  onKnock,
  disabled,
}: {
  onKnock: () => Promise<void>;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onKnock();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePress}
      disabled={disabled || loading}
      className="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-haze py-4 text-base font-semibold text-void
                 shadow-glow transition-transform duration-150 ease-out
                 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-void-line disabled:text-ink-faint disabled:shadow-none"
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-void border-t-transparent" />
          Mengetuk...
        </>
      ) : (
        <>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 3C9 3 7 5.5 7 8.5V11H6a1 1 0 00-1 1v7a2 2 0 002 2h10a2 2 0 002-2v-7a1 1 0 00-1-1h-1V8.5C17 5.5 15 3 12 3zm3 8H9V8.5C9 6.6 10.3 5 12 5s3 1.6 3 3.5V11z"
              fill="currentColor"
            />
          </svg>
          Ketuk Pintu
        </>
      )}
    </button>
  );
}
