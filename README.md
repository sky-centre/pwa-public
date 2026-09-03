# Sam-Zone — Sky Zone PWA (Public Visitor)

Public visitor interface untuk Sky Zone. Repo ini **hanya** menangani sisi
VISITOR — anonymous knock, status conversation, dan realtime chat setelah
disetujui. Semua fungsi owner (approve/reject, access code, dashboard) ada
di repo terpisah `sky-zone-android`.

## Kenapa alurnya begini

Link `/username` bersifat publik supaya siapa pun bisa memulai kontak tanpa
perlu nomor atau email pemilik. Status `PENDING → APPROVED` bekerja sebagai
filter spam: visitor tidak bisa masuk ke ruang chat sampai pemilik meninjau
dan menyetujui dari app Android.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS — token warna & tipografi custom mengikuti identitas
  Sam-Zone (lihat `tailwind.config.ts`)
- Supabase JS — Anonymous Auth, Postgres + RLS, Realtime
- PWA manual (manifest + service worker), tanpa dependency tambahan

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

`.env.local` sudah diisi dari kredensial yang kamu berikan (project
`sky-centre`, region `ap-southeast-1`). File ini di-gitignore — jangan
di-commit. Gunakan `.env.local.example` sebagai referensi untuk environment
lain.

Publishable/anon key aman dipakai di client karena semua akses dikontrol
lewat Row Level Security di database, bukan lewat menyembunyikan key ini.

## Struktur halaman

```
app/
  page.tsx                          → landing / brand explainer
  offline/page.tsx                  → fallback saat tidak ada koneksi
  [username]/page.tsx               → profil publik + knock door
  [username]/chat/[conversationId]/ → ruang chat realtime (visitor only)
```

## Skema database yang diasumsikan (project sky-centre)

Tabel: `users`, `public_profile`, `conversations`, `messages`, `devices`,
`access_codes` — semua dengan RLS aktif. Tipe TypeScript-nya ada di
`lib/types.ts`, disinkronkan manual dengan schema Supabase.

Repo ini **tidak membuat migrasi** — schema sudah ada di project Supabase.
Kalau owner belum punya kebijakan RLS untuk visitor anonim, minimal berikan:

- `public_profile`: SELECT untuk `anon`/`authenticated`
- `conversations`: INSERT untuk pembuat sesi (visitor_id = auth.uid() yang
  dipetakan lewat `users.auth_id`), SELECT hanya baris miliknya sendiri
- `messages`: INSERT/SELECT hanya untuk conversation miliknya dan hanya
  ketika `conversations.status = 'APPROVED'`

## Desain

Identitas visual (siluet hoodie, lingkaran neon biru, bubble chat) diambil
langsung dari mark "Sam-Zone" yang sudah ada — dipakai sebagai aset asli
(`public/logo/`), bukan ditiru ulang jadi CSS. Palet & rasa native mobile
dijelaskan sebagai token di `tailwind.config.ts`:

| Token | Hex | Peran |
|---|---|---|
| `void` | `#07080B` | Background utama |
| `void-raised` | `#0F1218` | Kartu / sheet |
| `haze` | `#38BDF8` | Aksen neon — aksi utama (Ketuk Pintu, kirim) |
| `signal-pending/approved/rejected/closed` | amber/hijau/merah/abu | Status conversation |

## PWA

- `public/manifest.json` — icon 192/512 + maskable, `display: standalone`
- `public/sw.js` — cache app-shell, fallback ke `/offline`, **tidak pernah**
  meng-cache trafik Supabase (API & realtime selalu live)
- `InstallPrompt` — banner custom "Add to Home Screen" yang mengikuti tema
  gelap, bukan prompt default browser

## Belum termasuk (sesuai rancangan v1)

- Push notification saat app tertutup (rencana lewat Supabase Edge
  Function)
- Riwayat visitor
- Advanced analytics
