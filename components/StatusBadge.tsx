import type { ConversationStatus } from "@/lib/types";

// Copy status tetap sama — hanya APPROVED yang naik kelas jadi gaya
// "active now" ala aplikasi premium; status lain tetap informatif.
const COPY: Record<ConversationStatus, string> = {
  PENDING: "Menunggu persetujuan",
  APPROVED: "Active now",
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
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] shadow-[0_0_18px_rgba(52,211,153,0.10),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl ${TEXT[status]}`}
    >
      <span className="relative flex h-2 w-2">
        {pulsing && (
          <span
            className={`absolute inline-flex h-full w-full animate-pulse-ring rounded-full ${DOT[status]}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${DOT[status]} ${
            status === "APPROVED" ? "shadow-[0_0_10px_currentColor]" : ""
          }`}
        />
      </span>
      {COPY[status]}
    </span>
  );
}
