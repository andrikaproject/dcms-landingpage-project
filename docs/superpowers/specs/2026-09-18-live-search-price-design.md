# Live Price pada Pencarian Coin

Tanggal: 18 September 2026  
Status: disetujui dalam percakapan, menunggu tinjauan dokumen

## Tujuan

Menampilkan harga terbaru dari Bitunix pada setiap hasil autocomplete `Search Coin` tanpa membuat jumlah user berbanding lurus dengan jumlah request ke API Bitunix.

## Batasan

- Harga hanya dimuat ketika dropdown autocomplete terbuka dan memiliki saran.
- Harga diperbarui setiap 10 detik selama dropdown tetap terbuka.
- Maksimal delapan simbol hasil saran dikirim oleh browser pada satu request.
- Pencarian dan pemilihan coin harus tetap berfungsi ketika feed harga gagal.
- Signal Board, pending plan, locked signal, dan history tidak berubah.
- Cache lintas instance seperti Redis atau KV tidak ditambahkan pada tahap ini karena deployment saat ini tidak memiliki penyimpanan cache bersama.

## Arsitektur

### Backend

Tambahkan endpoint terautentikasi untuk live price. Endpoint menerima daftar simbol yang dibatasi dan divalidasi, tetapi mengambil satu snapshot seluruh ticker Bitunix agar cache yang sama dapat dipakai oleh semua kombinasi pencarian.

Snapshot ticker disimpan di memori proses backend selama 10 detik. Request yang datang ketika pengambilan snapshot masih berjalan memakai Promise yang sama. Dengan demikian, banyak user pada satu instance backend menghasilkan paling banyak satu request upstream per jendela cache, bukan satu request per user atau per simbol.

Respons hanya memuat simbol yang diminta:

```json
{
  "asOf": "2026-09-18T02:45:00.000Z",
  "items": [
    { "symbol": "EDUUSDT", "lastPrice": "0.1234" }
  ]
}
```

Harga dipertahankan sebagai string desimal untuk menghindari perubahan presisi akibat konversi floating point.

Cache ini dibagi oleh seluruh user yang masuk ke proses backend yang sama. Browser session tidak digunakan karena session bersifat terpisah per user. Jika backend dijalankan pada beberapa instance, setiap instance masih memiliki cache sendiri; Redis atau KV menjadi peningkatan terpisah bila arsitektur deployment membutuhkannya.

### Frontend

`CoinSearchForm` meminta harga untuk simbol saran yang sedang terlihat saat dropdown dibuka. Polling berjalan setiap 10 detik dan berhenti saat dropdown ditutup, query tidak lagi menghasilkan saran, atau komponen dilepas.

Response lama tidak boleh menimpa query yang lebih baru. Request sebelumnya dibatalkan dengan `AbortController`, dan hasil harga disimpan berdasarkan `symbol`.

Daftar pair tetap memakai cache metadata yang sudah ada. Harga live tidak dimasukkan ke cache pair 24 jam.

## Tampilan dan State

Setiap baris autocomplete mempertahankan identitas coin di kiri. Kolom kanan menampilkan:

- `Live Price` sebagai label kecil;
- harga USDT yang sudah diformat sesuai `quotePrecision`;
- `Memuat harga...` ketika snapshot pertama belum diterima;
- `Harga tidak tersedia` ketika simbol tidak memiliki ticker atau request gagal.

Badge `USDT` dihapus karena quote sudah tampak pada simbol dan ruangnya dipakai untuk harga yang lebih berguna.

Design Read: dashboard trading untuk pengguna yang sedang memilih instrumen, memakai bahasa visual gelap yang sudah ada, dengan ENERGY 1 / RHYTHM 1 / MOTION 1.

Alasan keputusan visual:

- Layout dua kolom membuat simbol dan harga dapat dipindai dalam satu garis tanpa menambah tinggi dropdown.
- Harga diratakan ke kanan agar digit antarbaris mudah dibandingkan.
- Warna putih digunakan untuk nilai utama, sedangkan label dan fallback memakai zinc agar tombol Analyze tetap menjadi aksen utama.
- Tidak ada animasi harga karena polling adalah pembaruan data, bukan momen yang perlu menarik perhatian terus-menerus.

## Penanganan Batas API

- Satu snapshot semua ticker, bukan request ticker per simbol.
- TTL server 10 detik dibagi untuk seluruh user pada satu instance.
- Request bersamaan digabung menjadi satu pekerjaan upstream.
- Polling hanya aktif ketika dropdown terbuka.
- Endpoint frontend tidak memakai retry agresif; kegagalan menunggu siklus berikutnya.
- Rate limit endpoint internal tetap diterapkan untuk mencegah penyalahgunaan, tetapi cache diperiksa sebelum pekerjaan upstream baru dibuat.

## Pengujian

Backend:

- memvalidasi dan membatasi jumlah simbol;
- membentuk response harga tanpa kehilangan string desimal;
- menggunakan snapshot cache untuk user/request berikutnya;
- menggabungkan request bersamaan;
- tidak membuat request upstream baru sebelum TTL berakhir;
- menangani ticker yang tidak ditemukan.

Frontend:

- memformat harga berdasarkan presisi pair;
- meminta hanya simbol saran yang terlihat;
- melakukan polling 10 detik hanya saat dropdown terbuka;
- membatalkan request lama ketika query berubah atau dropdown ditutup;
- menampilkan loading dan fallback tanpa memblokir pemilihan coin;
- mempertahankan navigasi keyboard dan layout responsif.

Verifikasi akhir menjalankan unit test frontend dan backend, lint frontend, production build, serta pemeriksaan endpoint dan dropdown pada project yang berjalan.
