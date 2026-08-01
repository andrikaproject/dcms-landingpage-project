# PRD — Migrasi Frontend DCMS ke External API

## Ringkasan

Migrasikan seluruh komunikasi frontend DCMS dari route handler dan server action Next.js ke Express API produksi di `https://dcms-api.my.id`. Migrasi memakai pendekatan bertahap melalui satu API client bersama, sehingga setiap kelompok endpoint dapat dirilis, diobservasi, dan di-rollback tanpa menghentikan aplikasi.

Kontrak produksi yang diverifikasi pada 1 Agustus 2026:

- `GET https://dcms-api.my.id/health` merespons `200`.
- `GET https://dcms-api.my.id/docs/openapi.json` merespons `200` dan memuat 22 operasi `/v1`.
- Response sukses berbentuk `{ "ok": true, "data": ... }`.
- Response gagal berbentuk `{ "ok": false, "error": { "code", "message", "details?" } }`.

## Tujuan

1. Semua hit API aplikasi menggunakan base URL eksternal yang dapat dikonfigurasi.
2. Autentikasi tidak lagi bergantung pada NextAuth route handler atau server session Next.js.
3. Market, analysis, signal, akun, admin, password reset, dan Web Vitals memakai kontrak API `/v1` yang sama.
4. Kegagalan API dapat ditangani konsisten, aman, dan dapat diobservasi.
5. Setiap fase memiliki rollback tanpa harus mengembalikan seluruh deployment frontend.

## Di luar cakupan

- Mendesain ulang UI atau alur bisnis.
- Mengubah algoritme signal/market di backend.
- Menambahkan endpoint baru selain gap yang dicatat dalam PRD ini.
- Menghapus route Next.js sebelum fase terkait stabil di produksi.

## Asumsi dan prasyarat

- Frontend produksi harus memakai HTTPS.
- Frontend sebaiknya berjalan pada domain dalam registrable domain yang sama dengan `dcms-api.my.id` (contoh `app.dcms-api.my.id` atau domain `.my.id`) agar refresh cookie bukan third-party cookie. Bila frontend berada di domain berbeda, gunakan strategi token lintas domain yang disetujui sebelum fase autentikasi dirilis.
- Backend production mengizinkan origin frontend melalui `FRONTEND_URL`, mendukung credential cookie, dan memiliki `COOKIE_DOMAIN` yang sesuai.
- `https://dcms-api.my.id/docs` dan OpenAPI menjadi sumber kontrak rilis.
- Base URL tidak boleh di-hardcode di komponen.

## Arsitektur target

```text
Browser / Next.js UI
        │
        ├─ ApiClient (satu pintu request)
        │      ├─ Authorization: Bearer <access token>
        │      ├─ credentials: include (untuk refresh cookie)
        │      ├─ normalisasi { ok, data } / { ok: false, error }
        │      └─ satu kali refresh token saat 401
        │
        └── https://dcms-api.my.id/v1
                 ├─ Auth / Account
                 ├─ Market / Market Analysis
                 ├─ Signals
                 ├─ Admin
                 └─ Analytics
```

### API client

Tambahkan `NEXT_PUBLIC_API_BASE_URL=https://dcms-api.my.id/v1` pada environment frontend. Buat modul tunggal, misalnya `lib/api/client.ts`, yang:

- membangun URL dan query parameter;
- mengirim JSON dan `credentials: "include"`;
- menambahkan Bearer access token bila tersedia;
- meng-unwarp `data` dari envelope sukses;
- mengubah error menjadi satu `ApiError` dengan `status`, `code`, dan `message`;
- saat menerima 401 pada request terproteksi, memanggil `/auth/refresh` tepat satu kali, memperbarui token di memori, lalu mencoba ulang request asli satu kali;
- mengosongkan session dan mengarahkan ke `/login` bila refresh gagal;
- tidak menyimpan access token di `localStorage`, `sessionStorage`, URL, atau log.

## Autentikasi dan session

### Target flow

1. Halaman login memanggil `POST /v1/auth/login` dengan `identifier` dan `password`.
2. Backend mengembalikan `data.accessToken` dan menulis refresh token sebagai cookie HttpOnly.
3. `AuthProvider` menyimpan access token hanya di memori React.
4. Saat bootstrap aplikasi atau setelah reload, `AuthProvider` memanggil `POST /v1/auth/refresh` dengan `credentials: "include"` untuk memperoleh access token baru.
5. Request terproteksi memakai `Authorization: Bearer <accessToken>`.
6. Logout memanggil `POST /v1/auth/logout`, menghapus state lokal, dan mengarahkan pengguna ke `/login`.
7. Profil/role berasal dari `GET /v1/auth/me`; UI admin hanya ditampilkan bila role `ADMIN`.

### Konsekuensi Next.js

- Hentikan penggunaan `next-auth`, `auth()`, `signIn`, `signOut`, dan `/api/auth/[...nextauth]` setelah fase auth stabil.
- Data terproteksi yang saat ini dimuat dalam Server Component harus dipindahkan ke client-side API query, atau desain SSR terotentikasi yang terpisah. Server Component tidak boleh membaca atau mengekspos access token browser.
- Middleware Next.js hanya menjaga navigasi UI secara optimistis; backend tetap menjadi otoritas autentikasi dan role.

## Pemetaan endpoint

| Area frontend saat ini | Target produksi | Catatan migrasi |
| --- | --- | --- |
| NextAuth credentials | `POST /v1/auth/login`, `/refresh`, `/logout`, `/me` | Ganti session NextAuth dengan `AuthProvider`. |
| `/api/bitunix-users/register` | `POST /v1/auth/bitunix/register` | Adapt response envelope dan error code. |
| `/api/validate-bitunix-user`, gateway validate | `POST /v1/bitunix/validate` | Satu target untuk validasi UID. |
| `/api/password-reset/request` | `POST /v1/auth/password-reset/request` | Public; gunakan API client tanpa Bearer token. |
| `/api/password-reset/confirm` | `POST /v1/auth/password-reset/confirm` | Public; token reset tetap dikirim dalam body. |
| `/api/market-dashboard`, gateway dashboard | `GET /v1/market/dashboard` | Ubah consumer agar membaca `data`. |
| `/api/market-signal?symbol=BTCUSDT` | `GET /v1/market/signals/BTCUSDT` | `symbol` berpindah dari query ke path; `timeframe` dan `action` tetap query. |
| `/api/scam-pump-board` | `GET /v1/market/scam-pump-board` | Terproteksi. |
| `/api/vpvr` | `GET /v1/market/vpvr` | Terproteksi. |
| `/api/market-analysis/key-levels` | `GET /v1/market-analysis/key-levels` | Terproteksi; response dibaca dari `data`. |
| `/api/market-analysis/pwl-scanner` | `GET /v1/market-analysis/level-scanner` | Path berubah dan tetap memakai query `level`. |
| `/api/signal-history` | `GET /v1/signals/history` | Terproteksi; feature flag backend tetap berlaku. |
| `/api/locked-signals` | `GET/POST /v1/signals/locked` | Terproteksi; body create dipertahankan. |
| `/api/bitunix-users` dan `:id` | `/v1/admin/bitunix-users` dan `:id` | Hanya role `ADMIN`. |
| `/api/analytics/vitals` | `POST /v1/analytics/vitals` | Ganti `sendBeacon` dengan fetch `keepalive` agar base URL eksternal dipakai. |

## Gap yang harus ditutup sebelum cutover penuh

1. UI `app/dashboard/admin/users` saat ini memakai `lib/users` dan `app/actions/admin` untuk daftar, approval, dan penghapusan pengguna internal. OpenAPI produksi hanya memiliki administrasi `bitunix-users`; endpoint internal user management belum tersedia.
2. UI atau Server Component yang memanggil `lib/market-dashboard`, `lib/users`, dan service database langsung belum dapat dianggap selesai hanya dengan mengganti `fetch`. Mereka harus dipindahkan ke external API atau diberi endpoint backend yang ekuivalen.
3. Backend belum boleh dijadikan source tunggal untuk fungsi di atas sampai endpoint dan test kontraknya tersedia.

Keputusan rollout: gap tersebut tetap memakai implementasi Next.js untuk sementara, ditandai feature flag, dan tidak dihapus sampai API ekuivalen tersedia serta lolos acceptance criteria.

## Fase rollout

### Fase 0 — Fondasi

- Tambahkan `NEXT_PUBLIC_API_BASE_URL` untuk local, staging, dan production.
- Tambahkan `ApiClient`, `ApiError`, request ID, dan feature flag `NEXT_PUBLIC_EXTERNAL_API_ENABLED`.
- Tambahkan telemetry frontend: endpoint, status, latency, error code, retry, dan correlation/request ID bila tersedia; jangan log token atau password.
- Validasi CORS, cookie refresh, HTTPS, dan OpenAPI di staging.

### Fase 1 — Endpoint public

- Migrasikan Bitunix validation, register, forgot password, reset password, dan Web Vitals.
- Web Vitals memakai `fetch(url, { method: "POST", keepalive: true })`; tidak menggunakan relative `sendBeacon`.
- Acceptance: alur register/reset bekerja dengan response dan error yang sama atau lebih jelas.

### Fase 2 — Auth dan session

- Rilis `AuthProvider`, login, refresh, logout, me, guard admin, dan fallback 401.
- Jalankan NextAuth dan API auth melalui flag terpisah selama canary.
- Acceptance: reload browser mempertahankan sesi melalui refresh cookie; token tidak tersimpan persisten; logout mencabut session; user non-admin tidak dapat mengakses UI/admin API.

### Fase 3 — Market dan market analysis

- Migrasikan DashboardSignalWorkspace, DashboardSignalBoard, MarketAnalysisWorkspace, PwlProximityScanner, dan consumer VPVR.
- Konversi response envelope serta perubahan path market signal/scanner.
- Gunakan SWR/query key yang memasukkan base URL, symbol, timeframe, action, dan level.
- Acceptance: loading/error state tidak regresi; hasil response dibandingkan dengan API lama pada simbol/timeframe sampel; pembatalan request dan refresh bekerja.

### Fase 4 — Signals dan admin API yang sudah tersedia

- Migrasikan signal history, locked signals, dan admin Bitunix users.
- Jangan migrasikan admin internal users sampai gap endpoint ditutup.
- Acceptance: pagination, filter, create locked signal, dan authorisasi admin lulus smoke test.

### Fase 5 — Cutover dan penghapusan legacy

- Naikkan flag external API menjadi default setelah metrik stabil selama periode observasi yang disetujui.
- Hapus consumer `/api/*` hanya per kelompok yang telah stabil.
- Hapus route handler Next.js, helper server, dan dependensi NextAuth hanya setelah seluruh dependensinya tidak lagi dipakai.

## Rollback

- Setiap kelompok endpoint memiliki feature flag sendiri, misalnya `externalAuth`, `externalMarket`, `externalSignals`, dan `externalAnalytics`.
- Jika error rate, latency, atau conversion alur kritikal melewati ambang, aktifkan kembali provider Next.js untuk kelompok tersebut tanpa memengaruhi kelompok lain.
- Jangan rollback dengan menyalin token API ke storage persisten atau menonaktifkan validasi role.

## Error handling dan UX

- Tampilkan `error.message` yang aman untuk pengguna; gunakan `error.code` untuk penanganan programatik.
- 400: tampilkan error input pada field terkait.
- 401: coba refresh satu kali, lalu logout terkontrol bila gagal.
- 403: tampilkan akses ditolak dan redirect dari halaman admin.
- 404: tampilkan data/symbol tidak ditemukan.
- 429: tampilkan retry guidance dan jangan melakukan retry otomatis agresif.
- 5xx/network: tampilkan retry manual dan pertahankan data cache bila masih relevan.

## Acceptance criteria

- Tidak ada hit relative `/api/` tersisa pada kelompok yang sudah cutover.
- Semua request eksternal memakai base URL environment dan tidak ada hardcode domain dalam komponen.
- Login, reload, refresh, logout, dan admin guard lulus E2E di staging.
- Seluruh endpoint produksi yang dipakai frontend sesuai OpenAPI dan response adapter memiliki test.
- CORS preflight dan credential cookie bekerja dari origin frontend produksi.
- Tidak ada access token, refresh token, password, atau header Authorization pada telemetry/browser log.
- Error rate dan p95 latency memenuhi baseline yang disetujui sebelum legacy endpoint dihapus.
- Route Next.js hanya dihapus setelah feature flag eksternal aktif stabil dan rollback tidak lagi dibutuhkan.

## Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Refresh cookie tidak terkirim lintas domain | Verifikasi same-site domain/`COOKIE_DOMAIN` pada staging; jangan rilis auth sebelum sukses. |
| Contract response berbeda dari API lama | Gunakan adapter di ApiClient dan contract test dari OpenAPI. |
| 401 memicu refresh loop | Batasi refresh dan retry request masing-masing satu kali. |
| Endpoint internal admin belum ada | Pertahankan fitur tersebut di Next.js sampai backend menyediakan kontrak ekuivalen. |
| Market provider lambat/down | Preserve SWR cache, tampilkan stale state, dan observasi upstream 502. |
| Token bocor ke log | Redact header Authorization/cookie pada frontend dan backend; token hanya di memori. |

## Deliverables

- `ApiClient`, AuthProvider, dan API error model.
- Environment template untuk local/staging/production.
- Feature flags per fase dan dashboard observability.
- Test unit, integration, dan E2E untuk auth serta endpoint kritikal.
- Matriks endpoint dan daftar route legacy yang sudah aman dihapus.
- Runbook rollback dan bukti validasi CORS/cookie production.
