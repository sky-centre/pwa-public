import type { Message } from "@/lib/types";
import type { TickStatus } from "@/lib/messageStatus";

function StatusTicks({ status }: { status: TickStatus }) {
  if (!status) return null;

  // sent/delivered: satu warna pudar (void/50), dibedakan lewat jumlah centang.
  // read: penuh solid supaya jelas beda — "sudah dibaca".
  const opacityClass = status === "read" ? "opacity-100" : "opacity-50";

  return (
    <svg
      width="15"
      height="10"
      viewBox="0 0 15 10"
      fill="none"
      className={`inline-block shrink-0 text-void ${opacityClass}`}
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
        className={`max-w-[78%] animate-rise-in rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
          isMine
            ? "rounded-br-md bg-haze text-void"
            : "rounded-bl-md border border-void-line bg-void-raised text-ink"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.isi_pesan}</p>
        <span
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
            isMine ? "text-void/60" : "text-ink-faint"
          }`}
        >
          {time}
          {isMine && <StatusTicks status={tickStatus ?? null} />}
        </span>
      </div>
    </div>
  );
}
