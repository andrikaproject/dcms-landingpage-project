# CMS Ebook Frontend Implementation Plan

> **For agentic workers:** Gunakan skill executing-plans jika tersedia untuk mengerjakan checklist secara berurutan. Jika skill tidak tersedia, ikuti checklist ini langsung. Kerjakan hanya repository ini; jangan mengubah repository pasangan. Eksekusi inline kecuali pengguna meminta delegasi.

**Goal:** Membangun CMS admin, katalog ebook, pembaca subbab, tombol penyelesaian, dan laporan progres per pengguna.

**Architecture:** Next.js memakai apiRequest dan autentikasi yang sudah ada. FE mengambil isi dan progres dari Express melalui proxy; gambar diunggah langsung ke object storage memakai izin sementara dari BE. Editor menyimpan JSON dan pembaca memakai renderer React terpisah.

**Tech Stack:** Next.js 16, React 19, Tiptap, node:test, komponen dan styling project yang sudah ada.

**Project:** `/Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project`

## Dokumen acuan

- [Spesifikasi produk yang disetujui](../specs/2026-09-22-ebook-cms-design.md).
- [Kontrak integrasi FE dan BE](../specs/2026-09-22-ebook-cms-contract.md).

Semua path file di task relatif terhadap root repository ini; semua perintah dijalankan dari root tersebut. Seluruh task masih belum dikerjakan. Baca instruksi AGENTS.md yang berlaku. Pengguna telah memilih antislop selama pekerjaan; jangan tanyakan ulang.

## Batas pekerjaan dan dependensi BE

FE-01 dan pembuatan komponen/helper FE-02 dapat dimulai tanpa API ebook live dengan fixture sesuai kontrak. Pengujian alur admin FE-03 membutuhkan endpoint CMS/media BE-07; pembaca FE-04 dan laporan FE-05 membutuhkan endpoint progres/laporan BE-07. Seluruh alur live harus diverifikasi pada FE-06 setelah serah-terima BE-08.

Jangan membuat tabel, migrasi, endpoint Express, atau konfigurasi kredensial storage di FE. Jangan menyimpan kredensial S3 di NEXT_PUBLIC. FE memakai progres dari BE dan tidak menambah logika assignment/role khusus.

Fixture hanya untuk tes/pengembangan yang ditandai jelas, tidak menjadi fallback data sukses saat API gagal. Jika BE belum tersedia, catat bagian integrasi yang belum teruji sambil menyelesaikan pekerjaan UI/helper yang independen.

## Acuan visual

[Figma Flow Ebook DCMS](https://www.figma.com/design/DonojyIqh9rw3P0gKwDpMG/DCMS---Project-Assign?node-id=2411-7679): katalog `2372:3262`, detail `2375:5622`, pembaca `2411:11669`. Ambil kembali konteks desain saat implementasi. Ikuti struktur yang disetujui tanpa membawa label Test, durasi contoh, dan gembok role ke MVP.

Gunakan DashboardShell, AuthGuard, apiRequest, serta pola tampilan project yang sudah ada. CMS masuk melalui area admin. Aturan editor, batas file/dokumen, dan payload tercantum dalam kontrak integrasi lokal.

## Peta file FE

| Lokasi | Tanggung jawab |
| --- | --- |
| `lib/ebooks/api.js` | Wrapper API ebook, admin, progres, dan media |
| `lib/ebooks/content.js` | Kontrak dokumen, helper editor, dan link aman |
| `lib/ebooks/upload.js` | Upload browser langsung ke storage |
| `components/ebooks/LessonRenderer.jsx` | Render node JSON yang diizinkan |
| `components/ebooks/ProgressSummary.jsx` | Tampilan jumlah dan persentase dari BE |
| `components/ebooks/EbookCover.jsx` | Gambar privat dengan refresh URL ketika kedaluwarsa |
| `components/ebooks/admin/LessonEditor.jsx` | Editor Tiptap dan toolbar |
| `components/ebooks/admin/EbookEditor.jsx` | Metadata, bab, subbab, pengurutan, publikasi |
| `components/ebooks/admin/ProgressReport.jsx` | Tabel laporan dan detail pengguna |

## Task FE-01: Baseline dan koneksi lokal

Files: ubah `app/api/v1/[...path]/route.ts`, `.env.example`; buat `tests/unit/api-proxy-origin.test.js`. Catat baseline pada `docs/superpowers/verification/2026-09-22-ebook-cms-fe-validation.md` saat eksekusi.

- [ ] Periksa `git status --short` di repository FE. Catat perubahan yang sudah ada; jangan reset, stash, atau commit perubahan milik pekerjaan lain.
- [ ] Jalankan baseline FE: `npm test`, `npm run lint`, `npm run build`. Catat kegagalan yang sudah ada sebelum perubahan.
- [ ] Uji resolusi origin: override server-side harus menuju lokal, production tanpa override mempertahankan origin saat ini. Gunakan helper kecil `lib/api/proxy-origin.js` untuk fungsi yang diuji.

```js
export function resolveApiOrigin(configured, environment) {
    const fallback = environment === "production" ? "https://dcms-api.my.id" : "http://127.0.0.1:4000";
    const url = new URL(configured || fallback);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
        throw new Error("API_UPSTREAM_ORIGIN harus berupa origin HTTP atau HTTPS.");
    }
    return url.origin;
}
```

- [ ] Ganti konstanta proxy dengan hasil helper menggunakan `process.env.API_UPSTREAM_ORIGIN` dan `process.env.NODE_ENV`. Tambahkan `API_UPSTREAM_ORIGIN=http://127.0.0.1:4000` ke contoh konfigurasi lokal. Pertahankan cookie rewrite dan header auth yang ada.
- [ ] Jalankan `node --test tests/unit/api-proxy-origin.test.js`; harapkan override dan fallback lulus. Commit hanya perubahan task ini: `fix: configure API upstream for local CMS development`.

## Task FE-02: Client API, renderer, dan editor

Files: buat seluruh `lib/ebooks/*` dan `components/ebooks/*` pada peta file kecuali halaman/laporan; buat `tests/unit/ebook-content.test.js`, `tests/unit/ebook-upload.test.js`; ubah FE package dan lockfile.

- [ ] Pasang Tiptap saat implementasi: `npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image`. Kunci hasil resolusi paket. Pastikan semua paket memakai versi mayor yang sama, lalu periksa daftar extension agar link tidak terdaftar dua kali.
- [ ] Wrapper `api.js` memakai `apiRequest` untuk request JSON; tidak menyimpan bearer token sendiri. GET katalog/detail/lesson menerima `AbortSignal` untuk membatalkan respons usang saat navigasi.
- [ ] Upload helper memanggil init → PUT storage → complete. PUT storage memakai raw File, `credentials: omit`, dan hanya header hasil init. Jangan memakai `apiRequest` untuk URL storage karena akan menambahkan autentikasi DCMS.

```js
export async function putUploadFile(upload, file, signal) {
    const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.headers,
        credentials: "omit",
        body: file,
        signal,
    });
    if (!response.ok) throw new Error("Upload gambar gagal. Coba lagi.");
}
```

- [ ] Uji header upload tanpa Authorization, kegagalan PUT tidak memanggil finalisasi, kegagalan finalisasi dapat dicoba ulang, dan abort tidak menghapus isi draft.
- [ ] Bangun renderer dengan switch node dan React elements; teks dirender sebagai text node, bukan `dangerouslySetInnerHTML`. Node tak dikenal menampilkan error materi yang dapat dilaporkan tanpa mengeksekusi markup.
- [ ] Konfigurasikan editor sesuai allowlist. Extend node image agar menyimpan assetId/alt saja; tampilkan gambar lewat React node view yang meresolusikan URL sementara. Jangan memasukkan `src` sementara ke JSON ketika editor menyimpan.
- [ ] Tambahkan toolbar, label, focus state, upload gambar, alt text, save status, error, dan peringatan perubahan yang belum disimpan. Draft kosong boleh disimpan; tombol terbit memvalidasi kelengkapan melalui BE.
- [ ] Komponen gambar privat merender tanpa cache optimizer publik Next.js. Pada error karena URL kedaluwarsa, refresh satu kali dari endpoint terotorisasi sebelum menampilkan fallback dan tindakan coba lagi.
- [ ] Jalankan tes helper serta `npm run build` untuk menangkap masalah hydration editor. Commit `feat: add ebook editor and structured lesson renderer`.

## Task FE-03: Halaman CMS admin

Files: buat `app/dashboard/admin/ebooks/page.jsx`, `app/dashboard/admin/ebooks/[ebookId]/page.jsx`, `app/dashboard/admin/ebooks/[ebookId]/lessons/[lessonId]/page.jsx`; ubah `app/dashboard/admin/users/page.jsx` untuk tautan CMS admin.

- [ ] Daftar admin memuat status draft/terbit/arsip dan aksi “Tambah ebook”. Form baru membuat draft kemudian membuka halaman editor dengan ID server.
- [ ] Editor ebook mengelola judul, slug, deskripsi, cover, tambah bab/subbab, tombol urutan, dan status. Operasi per item menampilkan pending/error dan tidak mengubah UI sebagai berhasil sebelum konfirmasi server.
- [ ] Editor subbab memakai LessonEditor, tombol “Simpan”, “Pratinjau”, “Terbitkan”, dan “Arsipkan”. Jika materi sudah PUBLISHED, tampilkan bahwa penyimpanan langsung memperbarui materi pembaca.
- [ ] Pratinjau memakai LessonRenderer dengan payload admin; tidak memanggil endpoint open/completion. Hasil upload tersedia dalam preview setelah READY.
- [ ] Jalankan browser dengan akun admin pada backend lokal: buat ebook, tambah 2 bab/3 subbab, upload cover/gambar, urutkan, simpan draft, pratinjau, terbitkan, lalu arsipkan satu subbab.
- [ ] Ulangi navigasi memakai keyboard dan viewport 390 px. Verifikasi pengguna biasa tidak dapat membuka halaman admin atau memanggil endpoint-nya. Commit `feat: build ebook administration pages`.

## Task FE-04: Katalog dan pembaca

Files: ubah `app/dashboard/ebook/page.jsx`; buat `app/dashboard/ebook/[slug]/page.jsx`, `app/dashboard/ebook/[slug]/lessons/[lessonId]/page.jsx`, `components/ebooks/LessonReader.jsx`, `lib/ebooks/reader-state.js`, `tests/unit/ebook-reader-state.test.js`.

- [ ] Katalog menampilkan ebook PUBLISHED, cover, judul, dan progres server. Hapus label level/durasi contoh yang tidak memiliki data dalam skema MVP.
- [ ] Detail menampilkan bab yang memiliki subbab terbit dan indikator penyelesaian; semua subbab terbit dapat dibuka. Tidak menampilkan gembok prasyarat atau label role khusus.
- [ ] Pembaca memakai renderer, navigasi subbab, dan tombol “Tandai Selesai”. Kirim open hanya setelah isi sukses dimuat dan halaman pembaca aktif; jangan saat prefetch, preview admin, atau render server.
- [ ] State completion adalah idle → saving → saved/error. Saat saving, tombol disabled; saat error, tampilkan “Coba lagi”; saat saved, tampilkan “Selesai”. Abaikan respons lesson lama ketika pengguna telah berpindah subbab.
- [ ] Setelah completion berhasil, pakai summary BE dan invalidasi data katalog/detail terkait. Cache per sesi harus dibersihkan atau diberi key identitas saat logout/ganti akun.
- [ ] Uji reducer state untuk gagal simpan, retry, dan respons dari lesson yang sudah ditinggalkan. Verifikasi browser dengan dua sesi berbeda bahwa progres akun A tidak muncul pada akun B.
- [ ] Cocokkan susunan dengan Figma pada desktop dan 390 px; gunakan navigasi bab yang dapat dibuka/tutup pada layar kecil. Pastikan teks materi tidak terpotong dan judul panjang tidak menimbulkan overflow. Commit `feat: let members read ebooks and complete lessons`.

## Task FE-05: Laporan progres admin

Files: buat `app/dashboard/admin/ebooks/[ebookId]/progress/page.jsx`, `components/ebooks/admin/ProgressReport.jsx`, `components/ebooks/admin/UserProgressDetail.jsx`.

- [ ] Tampilkan tabel nama, email, jumlah subbab selesai/total, persen, subbab terakhir dibuka, dan aktivitas terakhir. Gunakan accountType/userId sebagai key, bukan email.
- [ ] Tambahkan pencarian dan pagination yang seluruhnya diproses BE. Reset page saat kata pencarian berubah dan batalkan respons request lama.
- [ ] Detail pengguna menampilkan susunan bab/subbab, status selesai, dan waktunya. Gunakan tanggal lokal browser untuk tampilan; jangan mengubah waktu UTC pada payload.
- [ ] Verifikasi fixture: pengguna belum mulai, pengguna hanya membuka, sebagian selesai, seluruhnya selesai, dua jenis akun dengan ID sama, serta nama panjang. Jangan menyebut selesai sebagai bukti memahami materi.
- [ ] Uji melalui browser bahwa publish/arsip subbab mengubah pembilang/denominator laporan sesuai detail ebook pengguna. Commit `feat: show per-user ebook reading progress`.

## Task FE-06: Validasi frontend dan integrasi live

Files: perbarui `README.md`, `.env.example`, dan `docs/superpowers/verification/2026-09-22-ebook-cms-fe-validation.md` dengan bukti aktual.

- [ ] Jalankan `npm test`, `npm run lint`, dan `npm run build`; bedakan baseline failure dari regresi CMS.
- [ ] Pastikan API_UPSTREAM_ORIGIN menuju backend uji dari BE-08. Verifikasi origin melalui request browser sebelum membuat data uji.
- [ ] Jalankan alur browser: admin membuat ebook dan materi, upload, pratinjau, terbitkan; pengguna A membuka lalu menandai selesai; A login ulang; admin melihat progres A dan B yang belum mulai.
- [ ] Uji refresh token, ganti akun, offline ketika completion, upload gagal, finalisasi gagal, URL media kedaluwarsa, direct lesson draft URL, dan double click selesai. Pastikan error terlihat serta retry tidak membuat sukses palsu.
- [ ] Uji penambahan subbab terbit dan arsip. Katalog/detail/laporan menampilkan denominator serta persentase yang dikirim BE; status lama tidak bocor antar akun.
- [ ] Verifikasi desktop dan layar 390 px, keyboard, fokus, judul panjang, loading, empty, serta error states. Catat screenshot/hasil browser nyata pada laporan lokal.
- [ ] Dokumentasikan konfigurasi proxy dan origin CORS yang perlu disampaikan ke BE. Kredensial object storage tetap hanya di BE.
- [ ] Catat bagian yang belum teruji jika backend atau storage uji belum tersedia. Tes dengan fixture tidak boleh dicatat sebagai integrasi live lulus.
- [ ] FE dirilis setelah migrasi dan BE siap. Pengujian serta dokumentasi lokal tidak otomatis melakukan deployment produksi.
- [ ] Commit hanya perubahan FE terkait: `docs: record ebook frontend and integration validation`.

## Urutan eksekusi

FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06. Gunakan kontrak lokal untuk pekerjaan independen; lakukan pemeriksaan browser task FE-03 sampai FE-05 ketika endpoint BE terkait tersedia.

## Cakupan

| Kebutuhan | Task FE |
| --- | --- |
| Baseline dan proxy backend lokal | FE-01 |
| API client, upload browser, editor, renderer | FE-02 |
| Admin membuat, mengurutkan, dan menerbitkan | FE-03 |
| Katalog, pembaca, tombol selesai, cache per akun | FE-04 |
| Laporan dan detail progres pengguna | FE-05 |
| Integrasi, error states, mobile, keyboard | FE-06 |
