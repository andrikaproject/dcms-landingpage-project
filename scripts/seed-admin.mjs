/**
 * Seed / upgrade user ke role ADMIN.
 * Jalankan dengan: node scripts/seed-admin.mjs
 *
 * Jika email sudah ada di DB → role di-upgrade ke ADMIN + statusReview = APPROVED.
 * Jika belum ada → user baru dibuat dengan role ADMIN.
 */

import { createPool } from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env dari root project
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, "../.env");

try {
    const envFile = readFileSync(envPath, "utf8");
    for (const line of envFile.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const raw = trimmed.slice(eqIdx + 1).trim();
        const value = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
        if (!(key in process.env)) process.env[key] = value;
    }
} catch {
    // .env not found — rely on existing env vars
}

// ─── Config ──────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "dcmsdeveloper@gmail.com";
const ADMIN_NAME  = process.env.SEED_ADMIN_NAME  || "Admin DCMS";
// Set SEED_ADMIN_PASSWORD env var to override default password.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@DCMS2024!";
const DATABASE_URL = process.env.DATABASE_URL;

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!DATABASE_URL) {
    console.error("❌  DATABASE_URL tidak ditemukan. Pastikan .env sudah ada.");
    process.exit(1);
}

const pool = createPool({ uri: DATABASE_URL });

async function main() {
    const [[existing]] = await pool.query(
        "SELECT id, email, role FROM User WHERE email = ? LIMIT 1",
        [ADMIN_EMAIL]
    );

    if (existing) {
        if (existing.role === "ADMIN") {
            console.log(`✅  ${ADMIN_EMAIL} sudah ADMIN. Tidak ada yang diubah.`);
        } else {
            await pool.query(
                "UPDATE User SET role = 'ADMIN', statusReview = 'APPROVED', updatedAt = ? WHERE email = ?",
                [new Date(), ADMIN_EMAIL]
            );
            console.log(`✅  ${ADMIN_EMAIL} berhasil di-upgrade ke ADMIN.`);
        }
    } else {
        const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
        const id = randomUUID();
        const now = new Date();

        await pool.query(
            `INSERT INTO User (id, name, email, password, role, statusReview, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 'ADMIN', 'APPROVED', ?, ?)`,
            [id, ADMIN_NAME, ADMIN_EMAIL, hashedPassword, now, now]
        );

        console.log(`✅  Admin user dibuat:`);
        console.log(`    Email    : ${ADMIN_EMAIL}`);
        console.log(`    Password : ${ADMIN_PASSWORD}`);
        console.log(`    ⚠  Ganti password setelah login pertama!`);
    }

    await pool.end();
}

main().catch((err) => {
    console.error("❌  Seed gagal:", err.message);
    process.exit(1);
});
