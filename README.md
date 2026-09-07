# DCMS Frontend

Frontend Next.js untuk DCMS. Seluruh autentikasi, data market, signal history, locked signal, dan administrasi dikonsumsi langsung dari Express API; project ini tidak lagi menyediakan route `/api` atau session NextAuth.

## Menjalankan lokal

Gunakan Node.js 20+, lalu:

```bash
npm install
npm run dev
```

API production dipakai secara default:

```text
https://dcms-api.my.id/v1
```

Untuk environment lain, set variabel berikut pada platform frontend:

```env
NEXT_PUBLIC_API_BASE_URL=https://dcms-api.my.id/v1
```

Origin frontend (misalnya `http://localhost:3000`, staging, dan domain production) juga harus tercantum pada `FRONTEND_URL` di backend agar request ber-credential lolos CORS.

## Verifikasi

```bash
npm run lint
npm run build
npm test
```

Kontrak endpoint interaktif tersedia di [dcms-api.my.id/docs](https://dcms-api.my.id/docs).

## Monitoring error browser

Halaman admin `/dashboard/admin/monitoring` menampilkan log per hari UTC; waktu entri mengikuti zona waktu browser admin. Reporter aktif otomatis pada build production. Untuk menguji di lokal, tambahkan ke `.env.local` lalu jalankan ulang frontend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/v1
NEXT_PUBLIC_CLIENT_LOGS_ENABLED=true
```

`NEXT_PUBLIC_CLIENT_LOGS_ENABLED` bersifat opsional (default kosong): isi `true` hanya untuk mengaktifkan pelaporan di luar build production, biasanya saat menguji ke backend lokal. Variabel publik dibaca saat build. Backend perlu menyediakan endpoint `/v1/logs/client` dan `/v1/admin/logs/*` beserta migrasi tabel `app_logs`.

Gunakan **Kirim error uji** lalu **Refresh** di halaman monitoring untuk memeriksa pipeline. Tombol ini tetap mengirim ketika flag development kosong. Laporan dikirim tanpa retry, maksimal 20 per menit per tab; kegagalan pengiriman tidak mengganggu halaman. Jika seluruh backend mati, endpoint penerima log juga tidak tersedia: laporan saat itu bisa hilang dan tidak dikirim ulang setelah backend pulih. Error HTTP dicatat backend, sedangkan reporter browser menangkap error JavaScript, rejection, crash render, dan kegagalan jaringan.
