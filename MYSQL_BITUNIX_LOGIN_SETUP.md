# MySQL Bitunix Login Setup

Flow login Bitunix ini memakai MySQL langsung tanpa Prisma.

## Environment

Tambahkan variable berikut ke `.env.local` atau environment deployment:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=dcms
DATABASE_URL="mysql://root:@localhost:3306/dcms"
```

Credential Bitunix tetap dibutuhkan untuk validasi UID saat register:

```env
BITUNIX_API_KEY=...
BITUNIX_API_SECRET=...
AUTH_SECRET=...
```

## Tabel dan Drizzle

Tabel `bitunix_users` dikelola oleh Drizzle + mysql2. Untuk database kosong, generate dan jalankan migration:

```bash
npm run db:generate
npm run db:migrate
```

Untuk shared hosting yang hanya menyediakan phpMyAdmin, gunakan SQL di folder `drizzle/` dan import manual lewat phpMyAdmin.

## API

Register:

```bash
curl -X POST http://localhost:3001/api/bitunix-users/register \
  -H 'Content-Type: application/json' \
  -d '{"uid":"499785117","email":"user@example.com","password":"password123","name":"Nama User"}'
```

List:

```bash
curl http://localhost:3001/api/bitunix-users
```

Detail:

```bash
curl http://localhost:3001/api/bitunix-users/1
```

Update:

```bash
curl -X PUT http://localhost:3001/api/bitunix-users/1 \
  -H 'Content-Type: application/json' \
  -d '{"email":"new@example.com","name":"Nama Baru","password":"passwordbaru"}'
```

Delete:

```bash
curl -X DELETE http://localhost:3001/api/bitunix-users/1
```

Login UI:

```text
/login
```

Login memakai `UID Bitunix + password`, lalu membuat session NextAuth dan redirect ke `/dashboard`.
