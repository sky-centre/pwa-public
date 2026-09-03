"use client";

import { useState, type FormEvent } from "react";

export function ChatComposer({
  onSend,
  disabled,
  placeholder = "Tulis pesan...",
}: {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text || sending || disabled) return;
    setSending(true);
    setValue("");
    try {
      await onSend(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="safe-bottom flex items-end gap-2 border-t border-void-line bg-void/95 px-3 pt-3 backdrop-blur"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        disabled={disabled}
        placeholder={disabled ? "Menunggu persetujuan owner..." : placeholder}
        rows={1}
        className="max-h-28 flex-1 resize-none rounded-2xl border border-void-line bg-void-raised px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-haze/60 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || sending || !value.trim()}
        aria-label="Kirim pesan"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-haze text-void transition-transform active:scale-90 disabled:bg-void-line disabled:text-ink-faint"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 11.5L20.5 3 12 20.5l-2.2-6.8L3 11.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}
