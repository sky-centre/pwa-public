import type { ConversationStatus } from "@/lib/types";

const COPY: Record<ConversationStatus, string> = {
  PENDING: "Menunggu persetujuan",
  APPROVED: "Chat aktif",
  REJECTED: "Tidak disetujui",
  CLOSED: "Percakapan ditutup",
};

const DOT: Record<ConversationStatus, string> = {
  PENDING: "bg-signal-pending",
  APPROVED: "bg-signal-approved",
  REJECTED: "bg-signal-rejected",
  CLOSED: "bg-signal-closed",
};

const TEXT: Record<ConversationStatus, string> = {
  PENDING: "text-signal-pending",
  APPROVED: "text-signal-approved",
  REJECTED: "text-signal-rejected",
  CLOSED: "text-signal-closed",
};

export function StatusBadge({ status }: { status: ConversationStatus }) {
  const pulsing = status === "PENDING";
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`inline-flex items-center gap-2 rounded-full border border-void-line bg-void-raised px-3 py-1.5 text-sm font-medium ${TEXT[status]}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {pulsing && (
          <span
            className={`absolute inline-flex h-full w-full motion-safe:animate-pulse-ring rounded-full ${DOT[status]}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${DOT[status]}`} />
      </span>
      {COPY[status]}
    </span>
  );
}
