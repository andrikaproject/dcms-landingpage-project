# Kontrak integrasi CMS Ebook v1

Status: acuan bersama untuk rencana implementasi FE dan BE, 22 September 2026. Endpoint dan payload di dokumen ini masih berupa target implementasi.

Salinan identik tersedia di kedua repository pada `docs/superpowers/specs/2026-09-22-ebook-cms-contract.md`. Saat kontrak berubah, perbarui kedua salinan dalam pekerjaan yang sama. Setelah API tersedia, OpenAPI BE harus cocok dengan kontrak ini.

## Aturan bersama

- Gunakan Tiptap untuk editor admin. Simpan JSON, bukan HTML. Aktifkan hanya paragraph, text, heading level 2/3, bold, bulletList, orderedList, listItem, link, hardBreak, dan node gambar berbasis `assetId`.
- Komponen editor adalah client component dengan `immediatelyRender: false`, mengikuti [panduan Tiptap Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs). Pembaca memakai renderer React terpisah dan tidak memuat editor.
- Gunakan `@aws-sdk/client-s3` dan `@aws-sdk/s3-request-presigner` untuk adapter media, berdasarkan [contoh resmi AWS SDK v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html). Endpoint, region, bucket, dan kredensial dikonfigurasi di BE. Tidak membuat bucket berbayar dalam tahap perencanaan.
- Gunakan Sharp untuk decode dan normalisasi gambar sebelum menulis objek final. Batasi input ke 10 MiB dan 25 juta piksel melalui [`limitInputPixels`](https://sharp.pixelplumbing.com/api-constructor/). Format yang diterima JPEG, PNG, WebP; output final WebP tanpa animasi.
- Batasi dokumen materi ke 512 KiB UTF-8 dan kedalaman 20. Ini tetap di bawah batas JSON Express yang saat ini 1 MiB.
- Judul maksimal 200 karakter, deskripsi ebook maksimal 2.000 karakter, slug lowercase maksimal 191 karakter, alt gambar maksimal 300 karakter, URL link maksimal 2.048 karakter. URL link hanya `https:` dan `http:`; atribut link renderer tetap dikendalikan aplikasi.
- Pakai tombol naik/turun untuk urutan bab/subbab pada MVP. Setiap tombol memiliki label sesuai item, mendukung keyboard, dan dinonaktifkan pada batas daftar atau saat request berjalan.
- Laporan pengguna memakai pagination 25 item dengan batas 100; sort berdasarkan nama tampilan, `accountType`, dan `userId` sebagai pemutus urutan. Pencarian nama/email berlaku sebelum pagination.
- Unggahan dan pembacaan media memakai URL sementara 5 menit. URL bersifat dapat digunakan oleh pemegangnya sampai kedaluwarsa; pengarsipan tidak membatalkan URL yang sudah diberikan secara seketika.

## Payload dan identitas

Respons menggunakan `{ ok: true, data }` dan format error BE yang sudah ada. Pada payload JSON, seluruh ID akun berbentuk string. Tanggal berupa ISO UTC atau `null`.

```json
{
  "progress": {
    "completedLessons": 2,
    "totalLessons": 5,
    "percent": 40,
    "status": "IN_PROGRESS",
    "lastLessonId": "lesson-2",
    "lastActivityAt": "2026-09-22T10:00:00.000Z"
  }
}
```

Status API: `EMPTY`, `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`. FE menerjemahkan ke label Bahasa Indonesia. Nilai contoh di atas adalah fixture pengujian, bukan data pengguna.

Dokumen editor versi 1:

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Pengantar" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Materi pembelajaran." }] },
    { "type": "image", "attrs": { "assetId": "asset-1", "alt": "Ilustrasi materi" } }
  ]
}
```

Draft boleh berisi dokumen kosong. Publikasi memerlukan minimal teks non-whitespace atau gambar READY. Setiap subbab menyimpan `contentSchemaVersion: 1`. Node gambar tidak menyimpan `src` atau URL presigned; FE meresolusikannya lewat map media dari respons.

Respons lesson menyertakan `{ lesson, progress, media }`; `media` memetakan asset ID ke `{ url, expiresAt, width, height }`. Cover pada katalog juga menyertakan metadata URL sementara. Tambahkan metadata `width`, `height`, `temporaryObjectKey`, dan `uploadExpiresAt` pada tabel media untuk implementasi lifecycle ini.

Endpoint tambahan untuk refresh media: `GET /v1/ebooks/:slug/media/:assetId` dan `GET /v1/admin/media/:assetId`. Endpoint pengguna hanya memberi URL jika aset READY adalah cover ebook terbit atau direferensikan subbab terbit milik ebook itu. Endpoint admin memakai autentikasi admin dan dapat dipakai pratinjau draft. Tidak tersedia endpoint publik untuk menandatangani object key bebas.

## Endpoint yang disediakan BE

FE memakai prefix `/api/v1` melalui proxy Next.js; path Express berikut memakai `/v1`. HTTP method yang dipisahkan koma berarti dua operasi terpisah.

| Endpoint BE | Fungsi |
| --- | --- |
| `GET /v1/ebooks` | Katalog ebook terbit dengan ringkasan progres pribadi |
| `GET /v1/ebooks/:slug` | Struktur terbit dan progres pribadi |
| `GET /v1/ebooks/:slug/lessons/:lessonId` | Isi subbab terbit, memvalidasi keanggotaan pada ebook |
| `POST /v1/ebooks/:slug/lessons/:lessonId/open` | Mencatat pembukaan subbab dari pengguna sesi |
| `PUT /v1/ebooks/:slug/lessons/:lessonId/completion` | Menandai selesai secara idempoten |
| `GET /v1/admin/ebooks` | Daftar ebook seluruh status |
| `POST /v1/admin/ebooks` | Membuat draft ebook |
| `GET, PATCH /v1/admin/ebooks/:ebookId` | Membaca dan memperbarui ebook, termasuk transisi status tervalidasi |
| `POST /v1/admin/ebooks/:ebookId/chapters` | Menambah bab |
| `PATCH /v1/admin/ebooks/:ebookId/chapters/:chapterId` | Mengubah judul bab |
| `PUT /v1/admin/ebooks/:ebookId/chapter-order` | Menyimpan urutan bab |
| `POST /v1/admin/ebooks/:ebookId/chapters/:chapterId/lessons` | Membuat draft subbab |
| `GET, PATCH /v1/admin/ebooks/:ebookId/lessons/:lessonId` | Membaca atau mengubah isi serta status subbab |
| `PUT /v1/admin/ebooks/:ebookId/chapters/:chapterId/lesson-order` | Menyimpan urutan subbab |
| `GET /v1/admin/ebooks/:ebookId/progress` | Laporan pengguna dengan pagination dan pencarian |
| `GET /v1/admin/ebooks/:ebookId/progress/:accountType/:userId` | Detail progres pengguna |
| `POST /v1/admin/media/uploads` | Memulai upload media |
| `POST /v1/admin/media/uploads/:assetId/complete` | Memverifikasi dan menyelesaikan upload |
| `GET /v1/ebooks/:slug/media/:assetId` | Refresh URL media yang boleh dibaca pengguna |
| `GET /v1/admin/media/:assetId` | Refresh URL media untuk admin, termasuk pratinjau draft |

## Aturan integrasi

- GET katalog/detail/lesson tidak menulis progres. FE memanggil endpoint open setelah materi berhasil ditampilkan pada halaman pembaca aktif.
- PUT completion memakai pengguna sesi dan tidak menerima userId dari browser. Pengulangan request mempertahankan completedAt pertama.
- Response progres memakai perhitungan BE; FE tidak menghitung ulang persentase dari data parsial.
- Semua ebook PUBLISHED tersedia bagi pengguna login. Status subbab dan ebook induk harus sama-sama PUBLISHED untuk membaca materi.
- Pratinjau admin menggunakan endpoint admin dan tidak menulis progres pembaca.
- Upload init menerima tujuan cover/gambar, nama file, tipe, dan ukuran. Respons `{ assetId, uploadUrl, headers, expiresAt }` mengizinkan satu lokasi objek sementara.
- Browser mengirim raw File melalui PUT ke uploadUrl dengan headers yang diberikan, tanpa bearer DCMS dan tanpa cookie. Browser kemudian memanggil endpoint complete. Hanya asset READY boleh dipakai pada publikasi.
- Row laporan diidentifikasi oleh accountType + userId. Pengguna tanpa aktivitas tetap masuk laporan dengan progres nol.
- Pencarian laporan memakai query `q`; pagination memakai `page` dan `limit`. BE melakukan pencarian sebelum pagination. Bentuk daftar yang dipakai FE harus dicantumkan dalam OpenAPI dan fixture kontrak sebelum integrasi live.
- Operasi reorder mengirim `{ ids: [...] }`, berisi semua ID saudara tepat sekali.
- Cache respons pribadi dan URL media adalah `private, no-store`. Refresh media hanya dilakukan melalui endpoint yang memeriksa akses.
- Error autentikasi 401; non-admin 403; konten tidak tersedia 404; konflik state 409; validasi Zod 400; storage belum dikonfigurasi 503 `MEDIA_STORAGE_UNAVAILABLE`. Detail error mengikuti envelope BE yang ada.

## Batas integrasi

FE boleh menyiapkan komponen dan tes dengan fixture yang mengikuti kontrak sambil BE dikerjakan. Fixture harus diberi label sebagai data pengujian dan tidak menjadi fallback yang menyamar sebagai hasil API pada aplikasi produksi. Integrasi dinyatakan selesai setelah upload, pembacaan, completion, dan laporan lulus terhadap BE serta storage uji nyata.
