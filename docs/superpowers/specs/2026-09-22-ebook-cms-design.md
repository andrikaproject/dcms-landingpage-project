# CMS Ebook DCMS

Tanggal: 22 September 2026

Status: rancangan dan dokumen disetujui pengguna pada 22 September 2026; siap menjadi acuan perencanaan implementasi.

## Tujuan dan keputusan

Admin mengelola ebook dengan susunan ebook → bab → subbab, kemudian melihat progres belajar setiap pengguna. Semua ebook yang diterbitkan otomatis tersedia bagi seluruh pengguna yang login. Pengguna menyelesaikan subbab melalui tombol “Tandai Selesai”.

CMS menjadi bagian dari FE dan BE DCMS yang sudah ada. MySQL menyimpan metadata, isi materi, dan progres. Object storage menyimpan cover dan gambar materi. Tidak diperlukan layanan CMS atau sistem login baru.

Keputusan yang telah disepakati:

- Admin membuat judul, deskripsi, cover, bab, subbab, dan isi materi.
- Admin mengatur urutan bab dan subbab.
- Editor mendukung heading, bold, daftar, link, dan gambar.
- Konten memiliki tahap draft dan publikasi.
- Membuka subbab mencatat aktivitas, tetapi tidak menambah persentase penyelesaian.
- Progres tersimpan di server dan tersedia lintas perangkat.
- Admin melihat progres per ebook dan rincian subbab per pengguna.
- Role khusus seperti OG DCMS serta pembagian ebook ke pengguna tertentu berada di luar lingkup MVP. Pembatasan operasi CMS untuk admin tetap memakai autentikasi yang sudah ada.

Bagian berikut menetapkan detail teknis dan aturan kasus tepi untuk mendukung keputusan tersebut. Detail ini merupakan rancangan, bukan klaim bahwa fitur sudah tersedia.

## Acuan project dan desain

- FE: `/Users/andrika/Documents/ProjectDCMS/dcms-landingpage-project`, Next.js 16, React 19.
- BE: `/Users/andrika/Documents/ProjectDCMS/dcms-api`, Express 5, Drizzle, MySQL.
- Desain: [Flow Ebook DCMS](https://www.figma.com/design/DonojyIqh9rw3P0gKwDpMG/DCMS---Project-Assign?node-id=2411-7679).
- Frame katalog: `2372:3262`; detail ebook: `2375:5622`; pembaca subbab: `2411:11669`.

Saat diperiksa, halaman `/dashboard/ebook` masih berupa placeholder. FE sudah memiliki `AuthGuard`, `apiRequest`, dan proxy `/api/v1/*` menuju `/v1/*` di BE. BE sudah memiliki `requireAuth`, `requireAdmin`, validasi Zod, format respons, dan pencatatan aktivitas.

Desain Figma menjadi acuan susunan halaman. Angka progres contoh, label “Test”, estimasi durasi, ikon gembok, dan keterangan role khusus di Figma tidak otomatis menjadi kebutuhan fungsional. MVP tidak memerlukan tes atau penguncian materi berurutan.

## Alur admin

1. Admin membuat draft ebook dengan judul dan deskripsi, lalu mengunggah cover.
2. Admin menambahkan bab dan subbab. Subbab berisi materi dari editor.
3. Admin menyimpan, mengurutkan, dan melihat pratinjau konten. Pratinjau tidak mencatat progres pembaca.
4. Admin menerbitkan subbab yang siap, kemudian menerbitkan ebook.
5. Ebook muncul pada katalog semua pengguna yang login.
6. Admin membuka laporan ebook untuk melihat progres seluruh pengguna, termasuk pengguna yang belum mulai.
7. Admin memilih pengguna untuk melihat subbab selesai, subbab terakhir dibuka, dan waktu aktivitas terakhir pada ebook tersebut.

Admin dapat mengarsipkan ebook atau subbab. Pengarsipan menyembunyikan konten dari pengguna tanpa menghapus ID dan progresnya. Penghapusan permanen konten serta pemindahan subbab antarbab tidak diperlukan pada MVP.

## Alur pengguna

1. Pengguna login dan membuka katalog ebook terbit.
2. Pengguna memilih ebook untuk melihat bab, subbab, dan progres pribadinya.
3. Pengguna dapat membuka subbab terbit dalam urutan apa pun.
4. Setelah isi berhasil dimuat, FE mencatat bahwa subbab dibuka. GET isi materi sendiri tidak mengubah progres, sehingga prefetch tidak tercatat sebagai membaca.
5. Pengguna menekan “Tandai Selesai”. BE menyimpan penyelesaian dan mengembalikan progres terbaru.
6. FE menampilkan status “Selesai” setelah server mengonfirmasi penyimpanan. Membuka ulang materi tidak membatalkan status selesai.

Katalog, detail ebook, dan laporan admin memakai definisi progres yang sama. FE tidak menentukan persentase secara independen dari BE.

## Pembagian tanggung jawab

| Bagian | Tanggung jawab |
| --- | --- |
| FE pembaca | Katalog, detail ebook, daftar bab/subbab, renderer materi, dan tombol penyelesaian |
| FE admin | Form ebook, editor subbab, pengurutan, pratinjau, publikasi, dan laporan |
| Modul ebook BE | Pengelolaan struktur, validasi, publikasi, pengarsipan, dan query katalog |
| Modul progres BE | Pencatatan aktivitas, penyelesaian idempoten, agregasi, dan laporan |
| Modul media BE | Otorisasi upload, verifikasi file, referensi media, dan akses file |
| MySQL | Relasi konten, dokumen editor, metadata media, dan progres |
| Object storage | Berkas cover dan gambar materi |

Modul baru mengikuti pola route/service yang sudah ada. Route CMS ebook dipisah dari file admin yang saat ini mengelola akun, log, dan fitur market. Tidak diperlukan microservice atau database tambahan.

## Model data

Semua tabel baru memakai ID stabil dan timestamp server. Nama kolom berikut merupakan kontrak konseptual; penamaan fisik mengikuti konvensi BE saat implementasi.

| Tabel | Kolom utama |
| --- | --- |
| `ebooks` | `id`, `slug`, `title`, `description`, `coverAssetId`, `status`, `publishedAt`, `createdByAccountType`, `createdByUserId`, `createdAt`, `updatedAt` |
| `ebook_chapters` | `id`, `ebookId`, `title`, `sortOrder`, `createdAt`, `updatedAt` |
| `ebook_lessons` | `id`, `chapterId`, `title`, `contentJson`, `contentSchemaVersion`, `sortOrder`, `status`, `publishedAt`, `createdAt`, `updatedAt` |
| `media_assets` | `id`, `objectKey`, `purpose`, `originalFilename`, `mimeType`, `sizeBytes`, `status`, `uploadedByAccountType`, `uploadedByUserId`, `createdAt`, `updatedAt` |
| `user_lesson_progress` | `id`, `accountType`, `userId`, `lessonId`, `firstOpenedAt`, `lastOpenedAt`, `completedAt` |

Aturan relasi dan indeks:

- `ebooks.slug` unik. Referensi progres memakai ID subbab, sehingga perubahan judul atau slug tidak menghilangkan progres.
- Bab mereferensikan ebook; subbab mereferensikan bab; progres mereferensikan subbab. Gunakan foreign key untuk relasi tersebut.
- Cover mereferensikan `media_assets`. Gambar di dokumen editor memakai ID media, bukan URL sementara.
- Pasangan `(accountType, userId, lessonId)` unik. Indeks ini mencegah progres ganda.
- Sediakan indeks `(ebookId, sortOrder, id)` untuk bab dan `(chapterId, sortOrder, id)` untuk subbab.
- Sediakan indeks berbasis `lessonId` untuk laporan progres per ebook. Pagination wajib pada daftar pengguna.

BE saat ini memiliki akun internal di `User` dan akun Bitunix di `bitunix_users`. Identitas progres memakai `(accountType, userId)` sesuai sesi. `accountType` menunjukkan sumber akun dan berbeda dari role otorisasi. Jangan menghubungkan seluruh progres ke tabel `User` saja atau memakai email sebagai identitas utama.

Database tidak dapat menerapkan satu foreign key pengguna ke kedua tabel akun. Service memvalidasi identitas melalui layanan akun yang sudah ada. Endpoint progres pribadi mengambil identitas dari sesi, bukan dari body request.

## Isi materi dan media

Isi subbab berupa dokumen JSON terstruktur dengan versi skema. Jenis konten MVP dibatasi pada paragraf, heading, bold, daftar, link, dan gambar. FE editor dan renderer memakai kontrak dokumen yang sama; BE memvalidasi node, atribut, ukuran dokumen, dan referensi media.

Renderer tidak menerima HTML arbitrer atau skrip dari isi materi. Link hanya menggunakan protokol yang diizinkan. Nama paket editor menjadi pilihan implementasi selama dapat memenuhi kontrak tersebut.

Object storage berada di balik layanan media BE. Penyedia storage dan nama bucket merupakan keputusan konfigurasi deployment; model ebook tidak bergantung pada nama penyedia. MVP memerlukan upload objek, pemeriksaan metadata, pembacaan terbatas, dan penghapusan upload yang tidak terpakai.

Alur upload:

1. Admin meminta sesi upload untuk cover atau gambar materi.
2. BE memvalidasi tujuan, format, dan ukuran yang diminta, membuat ID media serta object key unik, kemudian memberikan izin upload sementara.
3. Browser mengunggah langsung ke object storage. File tidak melewati proxy Next.js.
4. Browser meminta finalisasi. BE memverifikasi objek, ukuran, dan jenis berkas sebenarnya sebelum menandainya `READY`. Jangan mengandalkan nama ekstensi atau MIME dari browser saja.
5. Hanya aset `READY` yang boleh dipakai untuk publikasi.

Objek yang sudah `READY` harus merujuk ke byte yang telah diverifikasi. Gunakan key sementara yang dipromosikan ke key final yang tidak dapat ditimpa oleh URL upload lama, atau mekanisme versi objek yang setara. Penggantian cover atau gambar membuat aset baru.

Batasi MVP pada gambar JPEG, PNG, dan WebP, maksimal 10 MiB per file. Draft yang gagal upload tetap tersimpan dan dapat dilanjutkan. Upload sementara yang tidak difinalisasi dibersihkan setelah 24 jam; aset yang masih direferensikan konten tidak ikut dihapus.

BE memberikan akses baca media hanya setelah memeriksa otorisasi dan keterkaitannya dengan konten yang boleh dibaca. URL sementara tidak disimpan di database atau dokumen editor. Respons yang berisi URL sementara dan data progres pribadi tidak boleh masuk cache publik.

## Publikasi dan perubahan konten

- Ebook dan subbab memiliki status `DRAFT`, `PUBLISHED`, atau `ARCHIVED`.
- Bab hanya mengatur struktur. Bab tanpa subbab terbit tidak ditampilkan pada pembaca.
- Ebook dapat diterbitkan jika judul, deskripsi, cover yang siap, serta minimal satu subbab terbit di dalam bab valid tersedia.
- Subbab dapat diterbitkan jika judul, dokumen isi yang tidak kosong, dan seluruh referensi medianya valid.
- Subbab hanya dapat dibaca pengguna jika subbab dan ebook induknya sama-sama `PUBLISHED`.
- Menyimpan edit pada konten yang sudah terbit langsung memperbarui versi yang dibaca pengguna. UI editor menjelaskan perilaku ini. Draft revisi terpisah serta riwayat versi berada di luar MVP.
- Menambahkan subbab baru selalu dimulai sebagai draft. Draft tidak memengaruhi progres.
- Pengarsipan subbab mempertahankan catatan progres. Jika diterbitkan lagi dengan ID yang sama, progres lama berlaku kembali.
- Pengurutan memperbarui daftar saudara dalam satu transaksi, hanya menerima ID yang benar-benar berada pada induk tersebut, dan tidak mengubah ID konten.

## Aturan progres

Persentase dihitung dari subbab terbit yang saat ini termasuk dalam bab atau ebook:

`progressPercent = completedPublishedLessons / totalPublishedLessons × 100`

Gunakan pembulatan ke bawah untuk tampilan persentase, sehingga 100% hanya muncul ketika semua subbab terbit selesai. Jika denominator nol, hasilnya 0% dan statusnya “Belum ada materi”.

- `firstOpenedAt` diisi saat pencatatan aktivitas pertama.
- `lastOpenedAt` diperbarui saat subbab dibuka dengan waktu server.
- `completedAt` diisi pertama kali tombol “Tandai Selesai” berhasil diproses.
- Penyelesaian berulang tidak membuat baris baru atau mengganti waktu selesai pertama.
- Jika request selesai tiba tanpa catatan buka, BE membuat baris progres sekaligus mengisi waktu buka dan selesai. Kondisi ini dapat terjadi akibat request aktivitas sebelumnya gagal.
- Tindakan selesai turut memperbarui aktivitas terakhir. Request buka berikutnya tidak boleh menghapus `completedAt`.
- Penghitungan progres memakai agregasi data subbab, bukan rata-rata persentase bab, karena jumlah subbab tiap bab dapat berbeda.
- Penambahan subbab terbit dapat menurunkan persentase tanpa menghapus penyelesaian lama.
- Pengarsipan subbab mengeluarkannya dari pembilang dan denominator progres aktif.
- Edit isi, judul, atau urutan tidak mereset penyelesaian. Reset progres dan pembatalan selesai berada di luar MVP.

Status laporan: “Belum mulai” jika pengguna belum memiliki aktivitas pada subbab terbit, “Sedang membaca” jika sudah ada aktivitas tetapi belum semua selesai, dan “Selesai” jika seluruh subbab terbit selesai serta jumlahnya lebih dari nol.

## Laporan admin

Halaman laporan menampilkan satu ebook yang dipilih dan daftar pengguna dengan nama, identitas akun, jumlah subbab selesai, total subbab terbit, persentase, subbab terakhir dibuka, dan aktivitas terakhir. Pengguna tanpa progres tetap muncul dengan nilai nol dan waktu aktivitas kosong.

Detail pengguna menampilkan daftar bab dan subbab beserta status serta waktu penyelesaian. Aktivitas terakhir berasal dari interaksi ebook, bukan aktivitas dashboard market. Materi terarsip tidak dihitung dalam progres aktif.

Daftar pengguna menggabungkan dua sumber akun yang sudah ada dan memakai `(accountType, userId)` untuk identitas baris, pengurutan stabil, dan pagination. Akun yang sudah dihapus tidak muncul dalam laporan pengguna aktif.

Persentase menunjukkan penyelesaian yang dikonfirmasi pengguna. Sistem tidak menganggapnya bukti durasi baca atau pemahaman materi.

## Halaman dan API

Rute FE yang direncanakan:

| Halaman | Rute |
| --- | --- |
| Katalog ebook | `/dashboard/ebook` |
| Detail ebook | `/dashboard/ebook/[slug]` |
| Pembaca subbab | `/dashboard/ebook/[slug]/lessons/[lessonId]` |
| Daftar ebook admin | `/dashboard/admin/ebooks` |
| Editor ebook dan struktur | `/dashboard/admin/ebooks/[ebookId]` |
| Editor isi subbab | `/dashboard/admin/ebooks/[ebookId]/lessons/[lessonId]` |
| Laporan ebook | `/dashboard/admin/ebooks/[ebookId]/progress` |

FE memakai `/api/v1`; prefix di Express tetap `/v1`.

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

Rute bersarang selalu memeriksa hubungan parent-child. Otorisasi admin diterapkan di BE, selain guard halaman FE. Pratinjau memakai endpoint admin dan renderer materi yang sama dengan pembaca.

## Penanganan kegagalan

- Validasi menolak publikasi tidak lengkap dengan pesan pada field yang relevan.
- Subbab draft, terarsip, atau tidak cocok dengan ebook pada URL tidak memberikan isi materi melalui endpoint pengguna.
- Upload gagal menampilkan tindakan untuk mengulang tanpa menghapus draft materi.
- Penyimpanan progres gagal menampilkan tindakan “Coba lagi”. FE tidak menampilkan selesai sebagai status tersimpan sampai BE mengonfirmasi.
- Request selesai yang diulang setelah timeout tetap aman melalui constraint unik dan operasi database atomik.
- Sesi kedaluwarsa mengikuti mekanisme refresh FE yang sudah ada. BE tetap menjadi penentu izin.
- Katalog, editor, pembaca, dan laporan menyediakan keadaan loading, kosong, dan gagal. Navigasi bab/subbab dapat dipakai pada layar kecil dan dengan keyboard.

## Validasi implementasi

1. Pengguna biasa tidak dapat memanggil operasi admin, termasuk upload dan finalisasi media.
2. Draft tidak bocor melalui katalog, detail, direct URL subbab, atau akses media.
3. Pengguna dapat membaca seluruh ebook terbit tanpa assignment atau pemeriksaan role khusus.
4. Admin dapat membuat ebook, mengisi materi, mengurutkan struktur, menerbitkan, dan mengarsipkan.
5. Request selesai ganda dan request buka yang datang setelah selesai tidak menggandakan atau menghapus penyelesaian.
6. Progres dua pengguna dan dua jenis akun terpisah, termasuk bila nilai ID mentahnya sama.
7. Progres tetap tersimpan setelah refresh halaman dan login dari perangkat lain.
8. Subbab baru, draft, pengarsipan, dan publikasi ulang menghasilkan denominator serta persentase yang benar.
9. Laporan menampilkan pengguna yang belum mulai dan memiliki pagination stabil.
10. Upload invalid, upload gagal, dan upaya menimpa aset terverifikasi ditolak atau ditangani tanpa merusak konten terbit.
11. Konten editor tidak menjalankan skrip atau memuat referensi media yang tidak diizinkan.
12. Build dan lint project terdampak lulus, route manifest serta dokumentasi API diperbarui, dan alur admin/pengguna diperiksa di browser.

## Batas MVP dan urutan pengerjaan

MVP tidak mencakup kuis, sertifikat, pembayaran, assignment ebook, role baru, prasyarat subbab, PDF sebagai sumber utama materi, analitik waktu baca, reset progres, kolaborasi editor serentak, atau versioning konten.

Urutan implementasi: migrasi data dan service konten; integrasi media; CMS admin; katalog dan pembaca; progres pengguna; laporan admin; verifikasi integrasi. Rencana implementasi merinci perubahan per repository, pilihan editor, konfigurasi storage, dan pengujian sebelum kode fitur mulai dikerjakan.

## Pemeriksaan dokumen

- Lingkup: alur ebook, CMS, media, dan progres mendukung kebutuhan yang disepakati.
- Konsistensi: seluruh endpoint pengguna mengikuti status ebook dan subbab; pembilang serta denominator progres memakai himpunan subbab yang sama.
- Identitas: model mempertahankan dua sumber akun BE tanpa menambah role.
- Kelengkapan: perilaku draft, penyelesaian berulang, upload gagal, pengguna belum mulai, serta perubahan jumlah materi dijelaskan.
- Prosa: tidak ada klaim implementasi selesai, statistik rekaan, atau placeholder kebutuhan.
