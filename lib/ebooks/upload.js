// Upload gambar dari browser langsung ke object storage memakai izin sementara BE.
// Modul ini tidak memakai apiRequest untuk URL storage: apiRequest menambahkan
// bearer DCMS dan cookie, yang tidak boleh ikut ke penyedia storage.
import { isAbortError } from "../signals/request.js";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export class UploadError extends Error {
    constructor(message, { stage, assetId = null, cause } = {}) {
        super(message, { cause });
        this.name = "UploadError";
        // validate | init | put | complete. Hanya "complete" yang dapat diulang tanpa
        // mengunggah ulang berkas, karena objek sementara sudah ada di storage.
        this.stage = stage;
        this.assetId = assetId;
    }
}

export function validateImageFile(file) {
    if (!file) return "Pilih berkas gambar.";
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Format gambar harus JPEG, PNG, atau WebP.";
    if (!file.size) return "Berkas gambar kosong.";
    if (file.size > MAX_UPLOAD_BYTES) return "Ukuran gambar maksimal 10 MiB.";
    return null;
}

function stageMessage(error, fallback) {
    if (error?.code === "MEDIA_STORAGE_UNAVAILABLE") return "Penyimpanan gambar belum dikonfigurasi di server.";
    if (error?.code === "NETWORK_ERROR") return "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.";
    if (Number(error?.status) === 403) return "Akun ini tidak memiliki izin mengunggah gambar.";
    return (Number(error?.status) >= 400 && Number(error?.status) < 500 && error?.message) || fallback;
}

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

export async function finalizeUpload(api, assetId, { signal } = {}) {
    let result;
    try {
        result = await api.completeUpload(assetId, { signal });
    } catch (error) {
        if (isAbortError(error, signal)) throw error;
        throw new UploadError(stageMessage(error, "Verifikasi gambar gagal. Coba lagi."), { stage: "complete", assetId, cause: error });
    }
    const asset = result?.asset ?? result;
    if (asset?.status && asset.status !== "READY") {
        throw new UploadError("Gambar belum siap dipakai. Coba verifikasi lagi.", { stage: "complete", assetId });
    }
    return asset;
}

// api: { startUpload(body, { signal }), completeUpload(assetId, { signal }) }.
// Draft materi tidak disentuh di sini; pemanggil baru menyisipkan gambar setelah
// fungsi ini selesai, sehingga abort atau kegagalan tidak mengubah isi draft.
export async function uploadImage(file, { purpose, api, signal, onStage = () => {} }) {
    const invalid = validateImageFile(file);
    if (invalid) throw new UploadError(invalid, { stage: "validate" });

    onStage("preparing");
    let upload;
    try {
        upload = await api.startUpload({ purpose, filename: file.name, contentType: file.type, sizeBytes: file.size }, { signal });
    } catch (error) {
        if (isAbortError(error, signal)) throw error;
        throw new UploadError(stageMessage(error, "Upload gambar gagal dimulai. Coba lagi."), { stage: "init", cause: error });
    }
    if (!upload?.assetId || typeof upload.uploadUrl !== "string") {
        throw new UploadError("Respons izin upload dari server tidak lengkap.", { stage: "init" });
    }

    onStage("uploading");
    try {
        await putUploadFile(upload, file, signal);
    } catch (error) {
        if (isAbortError(error, signal)) throw error;
        throw new UploadError("Upload gambar gagal. Coba lagi.", { stage: "put", assetId: upload.assetId, cause: error });
    }

    onStage("verifying");
    const asset = await finalizeUpload(api, upload.assetId, { signal });
    onStage("ready");
    return { assetId: upload.assetId, asset };
}
