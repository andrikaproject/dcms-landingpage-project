### Objective
Implementasikan Drizzle ORM menggunakan driver `mysql2` untuk proyek Node.js/TypeScript. Berikan panduan langkah demi langkah beserta struktur kode yang clean, modular, dan type-safe.

### Tech Stack
- ORM: Drizzle ORM
- Database Driver: mysql2
- Runtime/Language: Node.js dengan TypeScript

### Requirements
1. **Setup & Konfigurasi:** 
   - Cara instalasi dependency yang dibutuhkan (`drizzle-orm`, `mysql2`, `drizzle-kit`, `dotenv`, dll).
   - File konfigurasi `drizzle.config.ts`.
   - File inisialisasi koneksi database (misal: `db.ts` atau `index.ts`).

2. **Schema Definition:**
   - Berikan contoh pembuatan tabel sederhana (misalnya tabel `users` dan `posts` untuk menunjukkan relasi *one-to-many*).
   - Gunakan tipe data MySQL yang tepat (seperti `varchar`, `int`, `timestamp`, dll) serta relasi yang menggunakan fitur `relations` bawaan Drizzle.

3. **Migrations:**
   - Perintah (script package.json) untuk melakukan *generate* migrasi dan cara menjalankan (*push* atau *run*) migrasi tersebut ke database MySQL.

4. **Contoh Query (CRUD):**
   - Berikan contoh fungsi basic untuk Insert, Select (dengan relational query / `with`), Update, dan Delete menggunakan Drizzle syntax.

Tolong sajikan kode dalam TypeScript yang clean, scannable, dan siap pakai.