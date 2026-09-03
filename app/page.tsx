import Image from "next/image";

const STEPS = [
  {
    title: "Buka link profil",
    body: "Tidak perlu install kontak atau tukar nomor — cukup buka link publik pemilik zona.",
  },
  {
    title: "Ketuk pintu",
    body: "Kirim satu ketukan berisi keperluanmu. Pemilik yang menilai, bukan sistem otomatis.",
  },
  {
    title: "Ngobrol setelah disetujui",
    body: "Begitu diterima, ruang chat realtime terbuka hanya untuk kamu berdua.",
  },
];

export default function LandingPage() {
  return (
    <main className="zone-backdrop flex min-h-dvh flex-col items-center px-6 safe-top safe-bottom">
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center py-10 text-center">
        <div className="relative h-40 w-40">
          <Image
            src="/logo/sam-zone-icon.png"
            alt="Sam-Zone"
            fill
            priority
            className="object-contain drop-shadow-[0_0_30px_rgba(56,189,248,0.35)]"
          />
        </div>

        <h1 className="mt-6 font-mark text-4xl leading-none text-ink">
          Selamat datang di{" "}
          <span className="text-haze">Sam&#8209;Zone</span>
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Ruang chat publik tanpa perlu tukar kontak. Setiap orang bisa
          mengetuk — kamu yang memutuskan siapa masuk.
        </p>
      </div>

      <ol className="w-full max-w-sm space-y-3 pb-8">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-2xl border border-void-line bg-void-raised/60 p-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-haze/15 text-sm font-semibold text-haze">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="pb-6 text-center text-xs text-ink-faint">
        Punya link dari seseorang? Buka langsung di{" "}
        <span className="text-ink-muted">sam-zone.app/username</span> mereka.
      </p>
    </main>
  );
}
