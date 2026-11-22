// Permukaan kaca untuk navigasi mobile yang melayang (gaya liquid glass).
// Kaca hanya dipakai di sini: satu-satunya lapisan yang melayang di atas konten
// yang bergulir, jadi blur memberi konteks tanpa menutupi isi halaman.
// - Tint gelap 70% + blur 20px + saturasi 180%: warna konten di belakang tetap
//   terasa. 70% dipilih dari kasus terburuk: tombol lime #b8fb5c lewat di
//   belakang dan label #cbd5e1 harus tetap >= 4.5:1.
// - Tanpa dukungan backdrop-filter, tint naik ke 92% supaya kontras terjaga.
// - Tepi: satu outline 0.5px yang sama di semua sisi + drop hitam rapat (resep
//   dark tactile; tanpa tepi atas yang menyala, tanpa glow).
export const GLASS_SURFACE =
    "bg-[#161a1e]/92 supports-[backdrop-filter]:bg-[#161a1e]/70 backdrop-blur-[20px] backdrop-saturate-[1.8] shadow-[0_0_0_0.5px_rgb(255_255_255/0.1),0_1px_2px_0_rgb(0_0_0/0.5),0_8px_16px_-8px_rgb(0_0_0/0.6)]";

// Lensa tab aktif: lapisan kaca yang lebih terang di dalam kapsul.
export const GLASS_LENS =
    "bg-white/[0.09] shadow-[0_0_0_0.5px_rgb(255_255_255/0.14),0_1px_2px_0_rgb(0_0_0/0.45)]";
