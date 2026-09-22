// Aturan form auth yang dipakai lebih dari satu halaman. Pola email sengaja
// longgar: cukup menangkap salah ketik yang jelas, keputusan akhir di backend.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getEmailError(value) {
    const email = String(value || "").trim();

    if (!email) return "Email harus diisi.";
    if (!EMAIL_PATTERN.test(email)) return "Format email belum benar, contoh: nama@gmail.com.";
    return "";
}
