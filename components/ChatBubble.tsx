import type { Message } from "@/lib/types";
import type { TickStatus } from "@/lib/messageStatus";

// Warna centang "dibaca" — biru tosca terang, dipisah dari warna
// sent/delivered (yang tetap pudar mengikuti warna teks bubble) supaya
// status "sudah dibaca" langsung menonjol tanpa perlu dibaca teksnya.
const READ_TICK_COLOR = "#2DD4BF";

function StatusTicks({ status }: { status: TickStatus }) {
  if (!status) return null;

  const isRead = status === "read";

  // sent/delivered: satu warna pudar, dibedakan lewat jumlah centang.
  // read: warna solid biru tosca terang — beda warna sekaligus beda opacity,
  // supaya "sudah dibaca" jelas menonjol dari kedua status lainnya.
  const opacityClass = isRead ? "opacity-100" : "opacity-50";

  return (
    <svg
      width="15"
      height="10"
      viewBox="0 0 15 10"
      fill="none"
      className={`inline-block shrink-0 ${isRead ? "" : "text-[#04121F]"} ${opacityClass}`}
      style={isRead ? { color: READ_TICK_COLOR } : undefined}
      aria-label={
        status === "sent"
          ? "Terkirim"
          : status === "delivered"
            ? "Diterima"
            : "Dibaca"
      }
    >
      <path
        d="M1 5.2L4 8L9.5 1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {status !== "sent" && (
        <path
          d="M5.5 5.2L8.5 8L14 1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function ChatBubble({
  message,
  isMine,
  tickStatus,
}: {
  message: Pick<Message, "isi_pesan" | "created_at">;
  isMine: boolean;
  tickStatus?: TickStatus;
}) {
  const time = new Date(message.created_at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] animate-rise-in px-4 py-2.5 text-[15px] leading-snug ${
          isMine
            ? "rounded-2xl rounded-br-md bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500 text-[#04121F] shadow-[0_14px_34px_-10px_rgba(14,165,233,0.45),0_4px_14px_-6px_rgba(14,165,233,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]"
            : "rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] text-ink shadow-[0_12px_28px_-14px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.isi_pesan}</p>
        <span
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
            isMine ? "text-[#04121F]/60" : "text-ink-faint"
          }`}
        >
          {time}
          {isMine && <StatusTicks status={tickStatus ?? null} />}
        </span>
      </div>
    </div>
  );
}
