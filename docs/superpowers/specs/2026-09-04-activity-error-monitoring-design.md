# Monitoring Log Aktivitas dan Error — Design

Tanggal: 4 September 2026
Status: disetujui untuk rencana implementasi
Repo terdampak: `dcms-landingpage-project` (frontend Next.js) dan `dcms-api` (backend Express)

## 1. Ringkasan

DCMS membutuhkan satu tempat untuk memantau error yang terjadi di website dan aktivitas user, dengan pengalaman "satu hari satu file": admin membuka halaman monitoring, melihat daftar hari, membuka satu hari untuk memfilter entri, mengunduh log hari itu sebagai CSV atau JSON, dan menghapus hari yang sudah berumur 30 hari atau lebih.

Saat ini log backend hanya hidup di stdout container Docker (pino-http), hilang saat container di-rebuild, tidak bisa difilter per user, dan tidak bisa diunduh. Error di browser tidak tertangkap sama sekali karena belum ada error boundary. Desain ini menambahkan penyimpanan log terstruktur di MySQL, penangkap error di browser, dan halaman admin untuk membaca, mengunduh, dan menghapusnya. Error dikelompokkan menjadi "masalah" dan diberi label dampak HIGH, MEDIUM, atau LOW berdasarkan aturan yang transparan.

## 2. Tujuan

1. Setiap error backend (kecuali noise rutin) dan setiap error browser tersimpan tahan lama di MySQL dan terkait ke user bila ada.
2. Aktivitas user yang bermakna tersimpan: autentikasi dan pemakaian fitur, tanpa polling dan tanpa aksi admin approve atau delete user.
3. Admin dapat melihat, memfilter, mengunduh, dan menghapus log per hari dari `/dashboard/admin/monitoring`.
4. Error dikelompokkan per sidik jari dan diurutkan berdasarkan dampak, sehingga admin tahu mana yang harus diperbaiki dulu.
5. Sistem log tidak pernah mengganggu request user, tidak pernah menyimpan rahasia, dan bisa dimatikan tanpa deploy ulang.

## 3. Di luar cakupan

- Notifikasi otomatis (email, Telegram) atau ringkasan harian terjadwal.
- Grafik tren, auto-refresh berkala, dan filter rentang tanggal di halaman monitoring.
- Penyimpanan Web Vitals ke database dan penilaian performance berdasarkan ambang Google. Tetap masuk stdout seperti sekarang.
- Log page view di browser.
- Mencatat aksi admin approve, reject, atau delete user, serta pengelolaan akun Bitunix.
- Mencatat respons 429 dari rate limiter. Handler limiter membalas langsung tanpa melewati errorHandler, jadi tidak tercatat di versi ini.
- Penghapusan otomatis. Penghapusan hanya manual oleh admin dengan aturan umur.

## 4. Keputusan yang disepakati

| Keputusan | Pilihan |
| --- | --- |
| Tempat penyimpanan | Backend Express, tabel baru `app_logs` di MySQL yang sama |
| Cakupan aktivitas | Audit autentikasi plus pemakaian fitur, tanpa page view dan tanpa aksi admin user |
| Pengambilan log harian | On-demand dari halaman admin, unduh CSV atau JSON per hari |
| Retensi | Tidak ada purge otomatis. Admin boleh menghapus satu hari hanya jika umurnya ≥ `APP_LOGS_DELETE_AFTER_DAYS` (default 30) |
| Struktur data | Satu tabel terpadu dengan kolom `kind` ERROR atau ACTIVITY |
| Peringkat dampak | Masuk versi pertama: kolom `fingerprint` dan `severity` dihitung saat tulis, dampak dihitung saat baca |
| Tombol error uji | Ada di halaman monitoring, untuk memverifikasi pipeline di lokal, QA, dan production |

## 5. Arsitektur dan alur data

```text
Browser (semua halaman, termasuk landing)
 ├─ ClientErrorReporter
 │    menangkap: JS error global, unhandled promise rejection,
 │    crash render React (error boundary), dan NETWORK_ERROR
 │    dari event dcms:api-request yang sudah ada
 │    └─ POST /v1/logs/client   (publik, rate limit, keepalive)
 │
 └─ /dashboard/admin/monitoring (admin saja)
      └─ GET    /v1/admin/logs/days          ringkasan per hari
         GET    /v1/admin/logs               daftar entri + filter
         GET    /v1/admin/logs/issues        error dikelompokkan + dampak
         GET    /v1/admin/logs/export        unduh CSV / JSON per hari
         DELETE /v1/admin/logs/days/:date    hapus, hanya jika cukup umur

Express API
 ├─ errorHandler (sudah ada)  → recordLog(kind=ERROR,    source=BACKEND)
 ├─ logActivity(req, type)    → recordLog(kind=ACTIVITY, source=BACKEND)
 │    dipanggil eksplisit di route yang bermakna, bukan semua request
 ├─ POST /v1/logs/client      → recordLog(kind=ERROR,    source=FRONTEND)
 └─ modules/logs/log.service.js → tabel app_logs
```

Prinsip yang mengikat semua bagian:

- **Penulisan log tidak pernah mengganggu request utama.** Insert berjalan fire-and-forget. Kegagalan hanya dicatat ke pino sebagai warning.
- **Backend adalah satu-satunya penulis.** Frontend hanya melapor error yang backend tidak mungkin tahu: error di browser dan request yang tidak sampai. Error API dengan status HTTP dicatat di backend, sehingga tidak ada entri ganda.
- **Identitas user diambil dari JWT yang sudah diverifikasi**, bukan dari body. Laporan browser tanpa token tercatat anonim.
- **Log tidak pernah menyimpan token, cookie, password, atau header Authorization.**
- **Pengelompokan harian memakai tanggal UTC.** UI menampilkan waktu lokal admin.

## 6. Katalog event

### 6.1 Aktivitas (kind = ACTIVITY, source = BACKEND, level = INFO)

| Tipe | Dipicu di | Detail (`details_json`) | Diredam |
| --- | --- | --- | --- |
| AUTH_LOGIN_SUCCESS | POST /auth/login berhasil | accountType | tidak |
| AUTH_LOGIN_FAILED | POST /auth/login gagal INVALID_CREDENTIALS | identifier yang dicoba | tidak |
| AUTH_LOGOUT | POST /auth/logout | tidak ada | tidak |
| AUTH_REGISTER | POST /auth/bitunix/register berhasil | uuidBitunix | tidak |
| AUTH_PASSWORD_RESET_REQUESTED | POST /auth/password-reset/request | email | tidak |
| AUTH_PASSWORD_RESET_COMPLETED | POST /auth/password-reset/confirm berhasil | tidak ada | tidak |
| MARKET_DASHBOARD_VIEW | GET /market/dashboard | query | ya |
| MARKET_SIGNAL_SEARCH | GET /market/signals/:symbol | symbol, timeframe, action | tidak |
| MARKET_SCAM_PUMP_VIEW | GET /market/scam-pump-board | tidak ada | tidak |
| MARKET_VPVR_VIEW | GET /market/vpvr | symbol, timeframe | ya |
| ANALYSIS_KEY_LEVELS_VIEW | GET /market-analysis/key-levels | symbol, interval | ya |
| ANALYSIS_LEVEL_SCAN | GET /market-analysis/level-scanner | level | tidak |
| SIGNAL_LOCK_CREATE | POST /signals/locked | symbol, timeframe, bias | tidak |
| SIGNAL_LOCK_DELETE | DELETE /signals/locked/:id | id, symbol | tidak |
| SIGNAL_HISTORY_VIEW | GET /signals/history | filter query | ya |
| ADMIN_LOGS_EXPORT | GET /admin/logs/export | date, format, kind | tidak |
| ADMIN_LOGS_DELETE | DELETE /admin/logs/days/:date | date, deleted | tidak |

Aktivitas dicatat setelah handler berhasil, tepat sebelum `ok(res, ...)`. AUTH_LOGIN_FAILED dicatat di jalur gagal sebelum AppError dilempar, dengan identitas user kosong.

**Peredam (throttle).** Untuk tipe bertanda "ya", kombinasi `userId|type|target` hanya dicatat sekali per 10 menit. `target` per tipe: MARKET_DASHBOARD_VIEW `-`, MARKET_VPVR_VIEW `symbol|timeframe`, ANALYSIS_KEY_LEVELS_VIEW `symbol|interval`, SIGNAL_HISTORY_VIEW `-`. Peredam adalah `Map` in-memory di backend: cukup karena API berjalan satu instance. Ukuran Map dibatasi 10.000 kunci; entri kedaluwarsa dibersihkan saat insert dan kunci tertua dibuang saat penuh.

Refresh token tidak dicatat. Tabel `signal_exposures` tetap seperti sekarang; ia melayani Adaptive Gate dengan tujuan berbeda.

### 6.2 Error backend (kind = ERROR, source = BACKEND)

Ditangkap di `errorHandler` yang sudah ada, sebelum respons dikirim.

- `status ≥ 500`: level ERROR. Detail memuat stack trace (maksimal 8.000 karakter).
- `400 ≤ status ≤ 499`: level WARN, **kecuali** kode berikut yang tidak dicatat: `UNAUTHORIZED`, `INVALID_ACCESS_TOKEN`, `REFRESH_REQUIRED`, `INVALID_REFRESH_TOKEN`, `NOT_FOUND`, `CORS_REJECTED`, dan `INVALID_CREDENTIALS` (yang terakhir sudah tercatat sebagai AUTH_LOGIN_FAILED).
- `type` diisi kode error (misalnya `VALIDATION_ERROR`, `INTERNAL_ERROR`, `BITUNIX_NOT_PARTNER`).
- Detail memuat `query`, `params`, `errorDetails` (dari `error.details`), dan `bodyKeys` (hanya nama field body, bukan nilainya, karena body bisa memuat password).

### 6.3 Error frontend (kind = ERROR, source = FRONTEND, level = ERROR)

Dikirim browser ke `POST /v1/logs/client`.

| Tipe | Sumber di browser | Detail |
| --- | --- | --- |
| CLIENT_UNCAUGHT_ERROR | event `error` di window | stack, userAgent |
| CLIENT_UNHANDLED_REJECTION | event `unhandledrejection` | stack, userAgent |
| CLIENT_RENDER_ERROR | `app/error.tsx` dan `app/global-error.tsx` | digest, scope (`route` atau `global`), stack |
| CLIENT_NETWORK_ERROR | event `dcms:api-request` dengan status 0 atau kode NETWORK_ERROR | path, method, requestId, durationMs, retried |

Tombol "Kirim error uji" di halaman monitoring mengirim CLIENT_UNCAUGHT_ERROR dengan pesan `Uji manual dari halaman monitoring oleh <email>` dan detail `{ manualTest: true }`.

## 7. Skema tabel `app_logs`

Mengikuti konvensi `src/db/schema.js`: id UUID varchar(191), `datetime(3)`, nama kolom snake_case, migrasi SQL manual di folder `drizzle/`.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | varchar(191) PK | UUID via `$defaultFn` |
| kind | varchar(16) NOT NULL | `ERROR` atau `ACTIVITY` |
| source | varchar(16) NOT NULL | `FRONTEND` atau `BACKEND` |
| level | varchar(8) NOT NULL | `INFO`, `WARN`, `ERROR` |
| type | varchar(64) NOT NULL | tipe event dari katalog; untuk error backend = kode error |
| severity | varchar(8) NULL | `HIGH`, `MEDIUM`, `LOW`; hanya untuk kind ERROR |
| fingerprint | varchar(64) NULL | hash pengelompokan; hanya untuk kind ERROR |
| user_id | varchar(191) NULL | `sub` dari JWT |
| user_email | varchar(255) NULL | |
| user_role | varchar(16) NULL | |
| account_type | varchar(16) NULL | `USER` atau `BITUNIX` |
| request_id | varchar(128) NULL | dari `X-Request-ID` / `req.id` |
| method | varchar(8) NULL | |
| path | varchar(512) NULL | path API untuk backend; pathname halaman untuk frontend |
| status_code | int NULL | null untuk aktivitas |
| error_code | varchar(64) NULL | kode AppError |
| message | varchar(1000) NOT NULL | dipotong bila lebih |
| details_json | text NULL | JSON, maksimal 8 KB setelah stringify |
| ip | varchar(64) NULL | `req.ip`, menghormati `TRUST_PROXY` |
| user_agent | varchar(512) NULL | dipotong bila lebih |
| log_date | date NOT NULL | tanggal UTC dari waktu tulis; kunci pengelompokan harian |
| created_at | datetime(3) NOT NULL | default `CURRENT_TIMESTAMP(3)` |

Indeks:

- `app_logs_log_date_kind_idx` (log_date, kind)
- `app_logs_user_email_created_at_idx` (user_email, created_at)
- `app_logs_type_created_at_idx` (type, created_at)
- `app_logs_log_date_fingerprint_idx` (log_date, fingerprint)

Migrasi: `drizzle/0002_app_logs.sql`, `CREATE TABLE IF NOT EXISTS` seperti dua migrasi sebelumnya. README backend menambah instruksi menerapkannya sebelum menjalankan versi API ini.

## 8. Sidik jari, keparahan, dan dampak

Semua aturan berada di satu file `src/modules/logs/impact-rules.js` berisi fungsi murni dan konstanta, sehingga mudah diuji dan disetel.

### 8.1 Fingerprint (dihitung saat tulis, hanya kind ERROR)

SHA-1 hex dari string gabungan:

- **FRONTEND:** `type | normalizedMessage | firstFrame`. `normalizedMessage` = pesan huruf kecil, deretan digit diganti `N`, deretan heksadesimal ≥ 8 karakter diganti `X`, dipotong 200 karakter. `firstFrame` = baris stack pertama yang memuat ` at ` atau `@`, dengan angka baris dan kolom (`:\d+:\d+`) dibuang; bila stack kosong, dipakai `path` halaman. Khusus CLIENT_NETWORK_ERROR yang tidak punya stack, `firstFrame` = `method` dan `path` API dari detail, agar kegagalan ke endpoint yang sama terkelompok.
- **BACKEND:** `method | routePattern | errorCode | statusCode`, ditambah `firstFrame` bila status ≥ 500. `routePattern` = `req.route?.path` bila ada, bila tidak `req.path` dengan segmen yang seluruhnya digit atau UUID diganti `:id`.

### 8.2 Keparahan dasar (`severity`, dihitung saat tulis)

Dievaluasi berurutan, aturan pertama yang cocok menang:

1. **HIGH** bila `status_code ≥ 500`, atau `type = CLIENT_RENDER_ERROR`, atau `path` diawali salah satu `CRITICAL_PATH_PREFIXES` (`/v1/auth/`, `/v1/signals/locked`), atau `path` halaman termasuk `CRITICAL_PAGES` (`/login`, `/register`, `/forgot-password`, `/reset-password`).
2. **MEDIUM** bila `type` termasuk `CLIENT_UNCAUGHT_ERROR`, `CLIENT_UNHANDLED_REJECTION`, `CLIENT_NETWORK_ERROR`, atau `path` diawali `/v1/market`, `/v1/market-analysis`, `/v1/signals`.
3. **LOW** untuk sisanya.

### 8.3 Dampak (dihitung saat baca, per fingerprint per hari)

Masukan: `severity` (tertinggi dalam kelompok), `count`, dan `uniqueUsers` = `COUNT(DISTINCT COALESCE(user_email, CONCAT('ip:', ip)))`.

1. Bila `uniqueUsers ≥ CRITICAL_USERS (20)` atau `count ≥ CRITICAL_COUNT (200)` → **HIGH**.
2. Bila `uniqueUsers ≥ ESCALATE_USERS (5)` atau `count ≥ ESCALATE_COUNT (50)` → naik satu tingkat dari `severity`.
3. Selain itu → sama dengan `severity`.

Dampak tidak pernah lebih rendah dari keparahan dasar. Urutan tampil: HIGH, MEDIUM, LOW, lalu `count` menurun, lalu `lastSeenAt` menurun. Aturan ini ditampilkan ringkas di halaman monitoring agar label HIGH bisa dipahami siapa pun.

## 9. Backend (`dcms-api`)

### 9.1 File baru

- `src/modules/logs/log.service.js`: satu-satunya pintu ke tabel. Ekspor `recordLog`, `listDays`, `listLogs`, `listIssues`, `exportLogs`, `deleteDay`, serta helper `redactDetails`, `truncate`, `toCsvRow`. Fungsi menerima dependensi opsional (`insert`, `select`, `now`, `logger`) seperti `password-reset.service.js`, sehingga bisa diuji tanpa database.
- `src/modules/logs/activity.js`: `logActivity(req, type, details, { target })` yang membangun entri dari `req.user`, `req.id`, `req.ip`, menerapkan peredam untuk tipe VIEW, lalu memanggil `recordLog`.
- `src/modules/logs/impact-rules.js`: `computeFingerprint`, `computeSeverity`, `computeImpact`, `EXCLUDED_ERROR_CODES`, dan konstanta ambang.
- `src/middleware/optional-auth.js`: bila header Bearer ada dan valid, isi `req.user`; bila tidak ada atau tidak valid, lanjut tanpa error.
- `src/routes/logs.routes.js`: endpoint ingest.
- `drizzle/0002_app_logs.sql`.

### 9.2 File yang diubah

- `src/db/schema.js`: tabel `appLogs`.
- `src/http/errors.js`: `errorHandler` memanggil `recordLog` untuk status ≥ 400 yang tidak dikecualikan.
- `src/routes/auth.routes.js`, `market.routes.js`, `market-analysis.routes.js`, `signals.routes.js`: memanggil `logActivity`.
- `src/routes/admin.routes.js`: lima endpoint log.
- `src/app.js`: mendaftarkan `/v1/logs`.
- `src/config/env.js`, `.env.example`: tiga variabel baru.
- `src/route-manifest.js`, `scripts/check-route-coverage.js`, `src/docs/operations.js`: enam operasi baru dan tag `Logs`.
- `README.md`: route group, env, dan langkah migrasi.

### 9.3 Endpoint

**POST /v1/logs/client** — publik, `optionalAuth`, rate limit `APP_LOGS_CLIENT_RATE_LIMIT` per menit per IP lewat `createRateLimit`.

Body (zod, semua string di-trim):

| Field | Aturan |
| --- | --- |
| type | enum empat tipe CLIENT |
| message | string 1–1000 |
| stack | string ≤ 8000, opsional |
| page | string 1–2048, wajib diawali `/`, tidak boleh memuat `?` atau `#` |
| digest | string ≤ 128, opsional |
| requestId | string ≤ 128, opsional |
| path | string ≤ 512, opsional |
| method | string ≤ 8, opsional |
| durationMs | number ≥ 0, opsional |
| retried | boolean, opsional |
| details | object, opsional, di-stringify ≤ 8 KB setelah redaksi |

Server mengisi `ip`, `user_agent`, identitas dari `req.user`, `source=FRONTEND`, `kind=ERROR`, `level=ERROR`, lalu menghitung `fingerprint` dan `severity`. Pemetaan kolom: `page` → `path`, `requestId` → `request_id`; `stack`, `digest`, `path`, `method`, `durationMs`, `retried`, dan `details` digabung ke `details_json`. Kolom `method` dan `status_code` tetap null untuk baris FRONTEND. Selalu membalas `202 { recorded: true }`, termasuk saat `APP_LOGS_ENABLED=false`, agar browser tidak mencoba ulang.

**GET /v1/admin/logs/days** — tanpa query. Mengembalikan `{ days: [...] }` berisi semua hari yang punya baris, terbaru dulu, dengan `date`, `errors` (level ERROR), `warnings` (level WARN), `activities` (kind ACTIVITY), `total`, `deletable`, dan `deletableAt` (tanggal saat hari itu boleh dihapus). `deletable` = selisih hari antara tanggal UTC hari ini dan `date` ≥ `APP_LOGS_DELETE_AFTER_DAYS`.

**GET /v1/admin/logs** — query:

| Field | Aturan |
| --- | --- |
| date | wajib, `YYYY-MM-DD` valid |
| kind, level, source | enum opsional |
| type | string ≤ 64, opsional |
| fingerprint | string ≤ 64, opsional |
| user | string ≤ 255, opsional, dicocokkan `LIKE %user%` ke `user_email` |
| q | string ≤ 200, opsional, dicocokkan `LIKE %q%` ke `message` |
| page | int ≥ 1, default 1 |
| limit | int 1–200, default 50 |

Mengembalikan `{ items, page, limit, total }` urut `created_at` menurun. Setiap item memuat semua kolom dengan `details` sudah di-parse (null bila JSON rusak), dan untuk kind ERROR ditambah `impact` dari agregat fingerprint hari itu (subquery per tanggal, di-join ke baris).

**GET /v1/admin/logs/issues** — query `date` wajib. Mengembalikan `{ issues: [...] }` maksimal 200 kelompok error hari itu, tiap kelompok memuat `fingerprint`, `type`, `source`, `severity`, `impact`, `count`, `uniqueUsers`, `firstSeenAt`, `lastSeenAt`, `sampleMessage`, `samplePath`, `sampleStatusCode`, `sampleErrorCode`. Urutan sesuai bagian 8.3.

**GET /v1/admin/logs/export** — query `date` wajib, `format` enum `csv` atau `json` wajib, `kind` opsional. Membalas `Content-Disposition: attachment; filename="dcms-logs-<date>[-<kind>].<format>"`. Baris dibaca per 1.000 dengan cursor `(created_at, id)` dan langsung ditulis ke response stream.

- CSV: UTF-8 dengan BOM, header kolom `created_at, kind, level, severity, impact, type, source, user_email, user_role, request_id, method, path, status_code, error_code, message, ip, user_agent, fingerprint, details_json`. Sel di-quote, kutip ganda digandakan, dan sel yang diawali `=`, `+`, `-`, atau `@` diberi awalan `'` untuk mencegah formula injection.
- JSON: satu array objek, dialirkan sebagai `[`, elemen dipisah `,`, ditutup `]`.

Mencatat aktivitas ADMIN_LOGS_EXPORT sebelum stream dimulai.

**DELETE /v1/admin/logs/days/:date** — params `date` `YYYY-MM-DD` valid.

1. Bila belum cukup umur → `409 LOG_DAY_TOO_RECENT`, pesan menyebut tanggal paling muda yang boleh dihapus.
2. Bila tidak ada baris → `404 LOG_DAY_NOT_FOUND`.
3. Selain itu hapus semua baris `log_date = :date`, catat ADMIN_LOGS_DELETE (masuk ke tanggal hari ini, jadi jejaknya tidak ikut terhapus), balas `{ date, deleted }`.

### 9.4 Perilaku `recordLog`

- Membangun baris, memotong `message` ke 1.000 karakter dan `user_agent` ke 512.
- `details` melewati `redactDetails`: secara rekursif membuang key yang cocok `/authorization|cookie|password|token|secret/i`, lalu di-stringify. Bila hasil > 8 KB, disimpan `{ truncated: true, preview: <8000 karakter pertama> }`.
- `log_date` = `new Date().toISOString().slice(0, 10)`.
- Insert dijalankan tanpa `await` dari jalur request; `.catch` menulis `logger.warn`.
- Bila `APP_LOGS_ENABLED=false`, langsung return tanpa apa pun.

### 9.5 Variabel environment

| Nama | Default | Validasi | Fungsi |
| --- | --- | --- | --- |
| APP_LOGS_ENABLED | true | booleanFlag | kill switch penulisan log |
| APP_LOGS_DELETE_AFTER_DAYS | 30 | int ≥ 0 | umur minimum hari yang boleh dihapus |
| APP_LOGS_CLIENT_RATE_LIMIT | 30 | int ≥ 1 | batas ingest per menit per IP |

## 10. Frontend (`dcms-landingpage-project`)

### 10.1 Penangkap error di browser

**`lib/monitoring/client-error-reporter.ts`** — modul murni tanpa React. Ekspor `createReporter({ endpoint, getToken, fetchImpl, now })` yang mengembalikan `{ report(entry, options), installGlobalListeners(target) }`, ditambah `isReporterEnabled()` dan `buildPage(location)`.

- `report` menerima `{ type, message, stack?, digest?, path?, method?, requestId?, durationMs?, retried?, details? }`, mengisi `page` dari `location.pathname` (tanpa query dan hash), memotong `stack` ke 8.000 karakter, lalu mengirim lewat `fetch` biasa dengan `keepalive: true`, `credentials: "include"`, dan header `Authorization: Bearer` bila `getToken()` mengembalikan token.
- **Tidak memakai `apiRequest`**, karena kegagalannya akan memancarkan `dcms:api-request` lagi dan berputar.
- **Dedupe:** hash djb2 dari `type|message|200 karakter pertama stack`; hash yang sama diabaikan selama 60 detik. `options.bypassDedupe` melewatinya (dipakai tombol error uji).
- **Anggaran:** maksimal 20 laporan per jendela 60 detik per tab; lewat itu dibuang diam-diam.
- **Anti-rekursi:** flag modul `reporting`; error yang terjadi saat `report` sedang berjalan diabaikan, dan semua kegagalan `fetch` ditelan. `report` tidak pernah melempar.
- `installGlobalListeners` memasang listener `error`, `unhandledrejection`, dan `dcms:api-request` (hanya diteruskan bila `detail.status === 0` atau `detail.code === "NETWORK_ERROR"`), dan mengembalikan fungsi pembersih.
- `isReporterEnabled()` = `process.env.NODE_ENV === "production"` atau `process.env.NEXT_PUBLIC_CLIENT_LOGS_ENABLED === "true"`. Alasannya: saat dev lokal, proxy `app/api/v1` meneruskan ke API production, sehingga tanpa aturan ini error saat ngoding masuk ke tabel production. `options.force` mengabaikan pengecekan ini (dipakai tombol error uji).

**`components/ClientErrorReporter.tsx`** — komponen client tanpa tampilan, dipasang di `app/layout.tsx` di samping `WebVitals`. `useEffect` memanggil `installGlobalListeners(window)` bila reporter aktif dan membersihkannya saat unmount.

**`app/error.tsx`** — error boundary route (client). `useEffect` melapor `CLIENT_RENDER_ERROR` dengan `digest` dan `scope: "route"`. Tampilan mengikuti gaya gelap DCMS: judul "Terjadi kesalahan", pesan umum tanpa detail teknis, tombol "Coba lagi" yang memanggil `reset()`, dan tautan ke `/dashboard`.

**`app/global-error.tsx`** — boundary untuk kegagalan root layout; wajib merender `html` dan `body` sendiri. Melapor dengan `scope: "global"`. Tampilan minimal dengan tombol muat ulang.

### 10.2 Helper unduh di klien API

`lib/api/client.ts` mendapat `apiDownload(path, { query })` yang mengirim `Authorization: Bearer`, mencoba `refreshSession` sekali bila 401 (seperti `apiRequest`), melempar `ApiError` bila gagal, dan mengembalikan `{ blob, filename }` dengan nama dari header `Content-Disposition` (fallback ke nama yang dibangun dari query). Halaman memicu unduhan lewat `URL.createObjectURL` dan elemen anchor sementara.

### 10.3 Halaman monitoring

Route `/dashboard/admin/monitoring`, dibungkus `AuthGuard admin`, gaya sama dengan halaman Management User: latar hitam, font Chakra, header dengan tautan kembali ke dashboard dan tautan silang ke Management User, API Documentation, dan Adaptive Gate. Header halaman Management User mendapat tautan "Monitoring & Logs →".

File:

- `app/dashboard/admin/monitoring/page.jsx`: shell halaman, guard, header, komposisi.
- `app/dashboard/admin/monitoring/MonitoringWorkspace.jsx`: state hari terpilih, tab, filter, paginasi, dan semua pemanggilan API.
- `app/dashboard/admin/monitoring/DayList.jsx`: daftar hari.
- `app/dashboard/admin/monitoring/LogEntries.jsx`: tab Entri, filter, tabel, baris yang bisa dibuka.
- `app/dashboard/admin/monitoring/LogIssues.jsx`: tab Masalah.
- `app/dashboard/admin/monitoring/format.js`: fungsi murni untuk label tipe, warna level dan dampak, format tanggal lokal, dan pembangun nama file. Diuji unit.

Struktur:

```text
┌ Monitoring & Logs ──────────────────────── [Kirim error uji] [Refresh] ┐
│ Daftar hari (terbaru dulu)                                              │
│ ┌ 4 Sep 2026   ● 3 error  ● 1 warn  ● 128 aktivitas  [Lihat][CSV][JSON][Hapus ✕] │
│ ┌ 1 Agu 2026   ● 1 error  ● 0 warn  ●  40 aktivitas  [Lihat][CSV][JSON][Hapus]   │
│                                                                         │
│ Detail hari: 4 Sep 2026        [Entri | Masalah]                        │
│ [Semua | Error | Aktivitas]  level ▾  source ▾  type ▾  [email] [cari…] │
│ ┌ 14:02:11  ERROR  HIGH  CLIENT_RENDER_ERROR  budi@…  Cannot read…   ▸  │
│ ┌ 13:58:40  INFO   —     MARKET_SIGNAL_SEARCH budi@…  BTCUSDT 15m    ▸  │
│                                          ‹ 1 / 6 ›   total 132 entri   │
└─────────────────────────────────────────────────────────────────────────┘
```

Perilaku:

- **Daftar hari** dari endpoint days. Badge error merah, warning kuning, aktivitas biru. Tombol Hapus nonaktif dengan keterangan "bisa dihapus mulai <deletableAt>" selama belum cukup umur. Saat aktif, konfirmasi menyebut tanggal dan total entri; setelah berhasil daftar dimuat ulang dan hari terpilih dikosongkan bila yang dihapus adalah hari itu.
- **Tab Entri**: filter kind sebagai tab, level dan source sebagai dropdown, type sebagai input teks dengan datalist berisi tipe dari katalog, input email dan pencarian dengan debounce 300 ms. Mengubah filter mengembalikan ke halaman 1. Baris menampilkan waktu lokal, pill level, pill dampak untuk error, tipe, user atau "anonim", ringkasan pesan, serta path dan status untuk error backend. Baris terbuka menampilkan request ID dengan tombol salin, IP, user agent, fingerprint, dan details serta stack dalam blok monospace yang bisa di-scroll.
- **Tab Masalah**: kelompok error hari itu urut dampak. Tiap kelompok menampilkan pill dampak, keparahan dasar, tipe, contoh pesan, jumlah, user unik, pertama dan terakhir terlihat. Klik kelompok berpindah ke tab Entri dengan filter fingerprint terisi. Di atas daftar ada ringkasan aturan dampak satu paragraf.
- **Unduh**: CSV dan JSON per hari lewat `apiDownload`; tombol menampilkan status sibuk selama unduh berjalan.
- **Kirim error uji**: memanggil `reporter.report` dengan `bypassDedupe` dan `force`, lalu toast "Laporan uji terkirim, tekan Refresh untuk melihatnya".
- **State kosong dan gagal**: belum ada hari sama sekali; hari tanpa hasil filter dengan tombol reset filter; error muat dengan tombol coba lagi, mengikuti pola halaman users.
- **Responsif**: di layar sempit baris hari dan entri menjadi kartu bertumpuk; filter menjadi dua kolom.

### 10.4 Environment dan dokumentasi

- `NEXT_PUBLIC_CLIENT_LOGS_ENABLED` didokumentasikan di README dan `.env.example` sebagai opsional, hanya untuk mengaktifkan reporter di luar build production.

## 11. Keamanan dan privasi

- Endpoint admin di bawah `requireAuth` dan `requireAdmin`. Aturan umur hapus ditegakkan di server.
- Endpoint ingest: rate limit per IP, setiap field dibatasi zod, `optionalAuth` tidak pernah melempar. `page` ditolak bila memuat query atau hash, sebagai lapisan kedua setelah frontend hanya mengirim pathname (halaman reset password membawa token di URL).
- Redaksi dua lapis: pino tetap membuang header sensitif; `redactDetails` membuang key sensitif di details. Body request tidak pernah disimpan, hanya nama field-nya.
- Ekspor CSV melindungi dari formula injection.
- Ekspor dan hapus tercatat sebagai aktivitas admin.
- Tombol error uji hanya ada di halaman admin; endpoint ingest sendiri tetap dibatasi rate limit.

## 12. Penanganan kegagalan

- Gagal tulis log → `logger.warn`, request user tidak terpengaruh.
- Migrasi belum diterapkan → penulisan gagal diam-diam; endpoint baca membalas 500 dan halaman menampilkan error muat dengan tombol coba lagi. Runbook rilis menyebut ini sebagai penyebab pertama yang dicek.
- Map peredam dibatasi 10.000 kunci dan dibersihkan saat insert.
- Stream ekspor putus → response berakhir; frontend menampilkan toast untuk mengulang.
- `apiDownload` gagal setelah refresh → `ApiError` ditampilkan sebagai toast.

## 13. Pengujian

### 13.1 Backend (`node --test`, pola yang sudah ada)

Unit dengan dependency injection (`tests/logs.test.js`, `tests/impact-rules.test.js`):

- `redactDetails` membuang key sensitif bersarang; `truncate` memotong message, user agent, dan details.
- `computeFingerprint` stabil untuk error yang sama dengan angka baris berbeda, dan berbeda untuk path atau kode berbeda.
- `computeSeverity` untuk tiap aturan di 8.2; `computeImpact` untuk tiap ambang di 8.3, termasuk jaminan tidak turun di bawah keparahan dasar.
- Peredam: kunci sama dalam 10 menit dicatat sekali; setelah jendela lewat dicatat lagi; ukuran Map tidak melebihi batas.
- `deleteDay` dengan `now` disuntikkan: ditolak pada umur 29 hari, diterima pada 30 hari, dan batas 0 menerima hari ini.
- `toCsvRow`: quoting, penggandaan kutip, dan awalan `'` untuk sel berawalan formula.

HTTP lewat supertest tanpa database (ditambahkan ke `tests/http.test.js`):

- `POST /v1/logs/client` → 400 untuk tipe tak dikenal dan `page` bermuatan `?`; 202 untuk payload valid dengan dan tanpa token.
- Endpoint admin log → 401 tanpa token, 403 untuk non-admin, 400 untuk `date` tidak valid, semuanya sebelum menyentuh database.
- `npm run check:routes` lulus dengan enam operasi baru.

### 13.2 Frontend (`node --test tests/unit/*.test.js`)

- `client-error-reporter.test.js`: dedupe dalam 60 detik, anggaran 20 per menit, `buildPage` membuang query dan hash, event `dcms:api-request` dengan status > 0 diabaikan, `report` tidak melempar saat `fetchImpl` reject, `bypassDedupe` dan `force` bekerja.
- `monitoring-format.test.js`: label, warna, dan nama file.

### 13.3 Manual

- `npm run lint` dan `npm run build` di frontend; `npm run lint`, `npm test`, `npm run check:routes` di backend.
- Skenario lokal di bagian 14: tombol error uji muncul di daftar; error dari console, unhandled rejection, backend dimatikan (network error), dan request tidak valid semuanya muncul dengan tipe dan dampak yang benar; file CSV terbuka di spreadsheet dan JSON valid; hapus ditolak sebelum cukup umur dan diterima dengan `APP_LOGS_DELETE_AFTER_DAYS=0`; ADMIN_LOGS_EXPORT dan ADMIN_LOGS_DELETE muncul di hari ini.

## 14. Pengujian di lokal

1. **Backend.** Di `dcms-api`: jalankan MySQL (`docker compose up -d mysql` atau layanan lokal), terapkan `drizzle/0002_app_logs.sql` ke database `dcms`, pastikan `.env` memuat tiga variabel baru (opsional, default sudah cukup), lalu `npm run dev`. API hidup di `http://localhost:4000`. CORS sudah mengizinkan `http://localhost:3000` secara default; cookie refresh bekerja karena dev memakai SameSite lax dan `localhost:3000` ke `localhost:4000` dianggap satu site.
2. **Frontend.** Di `.env.local` (menimpa `.env`):

   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/v1
   NEXT_PUBLIC_CLIENT_LOGS_ENABLED=true
   ```

   Lalu `npm run dev`. Semua request dan laporan error masuk ke MySQL lokal.
3. **Memicu kejadian.** Login sebagai admin, buka `/dashboard/admin/monitoring`, tekan "Kirim error uji". Error browser lain dari DevTools console; network error dengan mematikan backend sebentar; error backend dengan query tidak valid, misalnya `timeframe=2h` ke `/market/dashboard`.
4. **Aturan hapus.** Set `APP_LOGS_DELETE_AFTER_DAYS=0` di `.env` backend lokal untuk menguji hapus tanpa menunggu 30 hari.

## 15. Rilis dan rollback

1. **Backend.** Terapkan `0002_app_logs.sql` ke database production sebelum men-deploy versi API ini. Tambahkan tiga variabel env di `.env` server (boleh mengandalkan default). Restart lewat `restart-dcms.sh`. Verifikasi: endpoint baru tampil di `/docs`, `POST /v1/logs/client` membalas 202, `GET /v1/admin/logs/days` membalas 200 dengan token admin.
2. **Frontend.** Deploy. Reporter aktif otomatis di build production. Verifikasi lewat tombol error uji di halaman monitoring, lalu refresh dan pastikan entri muncul dengan email admin.
3. **Rollback.** `APP_LOGS_ENABLED=false` lalu restart menghentikan semua penulisan tanpa deploy ulang; endpoint baca tetap bekerja. Frontend yang rilis lebih dulu dari backend tidak berbahaya: laporan yang gagal kirim ditelan, dan halaman monitoring menampilkan error muat.

## 16. Kriteria penerimaan

- Error backend 500 dan 4xx yang tidak dikecualikan, error browser dari empat sumber, dan semua tipe aktivitas di katalog muncul di tabel dengan identitas user bila ada.
- Tidak ada token, cookie, password, header Authorization, atau nilai body request di kolom mana pun.
- Key levels yang di-poll tiap 30 detik hanya menghasilkan satu ANALYSIS_KEY_LEVELS_VIEW per user per simbol per 10 menit.
- Halaman monitoring menampilkan daftar hari, filter entri, tab Masalah urut dampak, unduh CSV dan JSON, dan hapus dengan aturan umur yang ditegakkan server.
- Semua test backend dan frontend lulus; `check:routes`, lint, dan build lulus di kedua repo.
- Spec ini tersimpan identik di `docs/superpowers/specs/` kedua repo.
