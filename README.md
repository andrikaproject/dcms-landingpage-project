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
```

Kontrak endpoint interaktif tersedia di [dcms-api.my.id/docs](https://dcms-api.my.id/docs).
