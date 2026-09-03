import type { Message } from "@/lib/types";

export function ChatBubble({
  message,
  isMine,
}: {
  message: Pick<Message, "isi_pesan" | "created_at">;
  isMine: boolean;
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
          className={`mt-1 block text-right text-[11px] ${
            isMine ? "text-void/60" : "text-ink-faint"
          }`}
        >
          {time}
        </span>
      </div>
    </div>
  );
}
