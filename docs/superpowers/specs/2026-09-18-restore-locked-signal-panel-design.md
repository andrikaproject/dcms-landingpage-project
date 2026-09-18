# Restore Locked Signal Panel Design

## Tujuan

Mengembalikan identitas fitur Locked Signal sebagai area pemantauan pribadi yang terpisah dari Signal Board. Coin yang dipilih user melalui hasil analisis harus mudah ditemukan dan dipantau tanpa tercampur dengan daftar signal biasa.

## Tata Letak

- Panel `Lock Signal / Rencana yang Diikuti` dikembalikan ke posisi sebelumnya: setelah ringkasan dashboard dan sebelum area pencarian serta Signal Board.
- Panel mempertahankan refresh otomatis lima menit dan tombol `Refresh Harga` manual.
- Empty state menjelaskan bahwa user perlu menekan `Pantau Signal` pada kartu hasil analisis.

## Kartu Locked Signal

- Gunakan kembali desain kartu Locked Signal lama tanpa redesign.
- Pertahankan badge bias dan lifecycle, harga terkini, progress bar SL–Entry–TP, partial TP plan, RSI, R:R, EMA, Stoch RSI, serta tombol hapus individual.
- Status lifecycle tetap berasal dari backend. `PENDING_ENTRY` menampilkan jarak ke entry, sedangkan `ACTIVE` menampilkan performa sejak entry agar badge dan persentase tidak saling bertentangan.
- Tombol `Pantau Signal` pada hasil analisis menyimpan signal ke backend dan langsung menambahkannya ke panel ini.
- Signal yang sudah dipantau menampilkan tombol `Dipantau` dan tidak membuat duplikat.

## Pemisahan Tanggung Jawab

- Panel Locked Signal hanya berisi signal yang dipilih user untuk dipantau.
- Signal Board kembali menampilkan daftar signal biasa dan tidak merender kartu Locked Signal.
- Input pencarian tidak digunakan sebagai filter Signal Board.
- `Clear All Signal` hanya membersihkan Signal Board; tidak menghapus Locked Signal.
- Locked Signal hanya dapat dihapus melalui tombol hapus pada kartu masing-masing.
- Endpoint bulk-delete Locked Signal yang ditambahkan saat penggabungan panel dicabut agar `Clear All Signal` tidak dapat menghapus pemantauan user secara tidak sengaja.

## State dan Data

- Dashboard memuat Locked Signal aktif melalui `GET /v1/signals/locked?status=ACTIVE`.
- Penambahan menggunakan `POST /v1/signals/locked` dan penghapusan individual menggunakan `DELETE /v1/signals/locked/:id`.
- Daftar tetap terisolasi berdasarkan user di backend.
- Refresh manual dan otomatis memperbarui data tanpa menggandakan kartu.

## Verifikasi

- Kartu lama tampil kembali pada panel terpisah di posisi semula.
- Klik `Pantau Signal` langsung menambahkan kartu ke panel Locked Signal.
- Reload halaman mempertahankan daftar milik user.
- Status pending dan active menampilkan label serta perhitungan yang sesuai.
- `Clear All Signal` tidak mengubah daftar Locked Signal.
- Penghapusan individual menghapus satu Locked Signal saja.
- Tes frontend, backend, lint, route coverage, dan production build tetap lulus.
