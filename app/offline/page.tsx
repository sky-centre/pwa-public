export default function OfflinePage() {
  return (
    <main className="zone-backdrop flex min-h-dvh flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-void-line bg-void-raised">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 8.5c5-4 13-4 18 0M6.5 12c3.2-2.5 7.8-2.5 11 0M10 15.5c1.3-1 2.7-1 4 0M12 19h.01"
            stroke="#5B6472"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h1 className="mt-5 text-lg font-semibold text-ink">Tidak ada koneksi</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-muted">
        Sam-Zone butuh internet untuk mengetuk pintu dan chat realtime.
        Sambungkan kembali lalu coba lagi.
      </p>
    </main>
  );
}
