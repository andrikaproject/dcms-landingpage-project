import { z } from "zod";
import { gatewayError, gatewayOk, enforceRateLimit } from "@/lib/api-gateway";
import { validateBitunixUser } from "@/lib/bitunix";

export const runtime = "nodejs";

const validateUidSchema = z.object({
    uid: z
        .string()
        .trim()
        .regex(/^[0-9]{5,20}$/, "UID harus berupa angka dengan panjang 5 sampai 20 digit."),
});

export async function POST(request) {
    const body = await request.json().catch(() => ({}));
    const parsed = validateUidSchema.safeParse({ uid: body.uid || body.uuidBitunix });
    const uid = parsed.success ? parsed.data.uid : String(body.uid || body.uuidBitunix || "").trim();
    const rateLimit = await enforceRateLimit(`gateway-bitunix-validate:${uid || "empty"}`, {
        limit: 20,
        windowMs: 10 * 60 * 1000,
    });

    if (rateLimit.response) return rateLimit.response;

    if (!parsed.success) {
        return gatewayError(
            "INVALID_UID",
            parsed.error.issues[0]?.message || "UID Bitunix tidak valid.",
            400
        );
    }

    try {
        const result = await validateBitunixUser(uid);
        return gatewayOk(result);
    } catch (error) {
        return gatewayError(
            "BITUNIX_UNAVAILABLE",
            error.message || "Tidak bisa menghubungi Bitunix saat ini.",
            502
        );
    }
}
