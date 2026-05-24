import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to register an admin.");
}

const pool = mysql.createPool({ uri: databaseUrl });

async function run() {
    console.log("⏳ Sedang mendaftarkan Admin...");
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    try {
        await pool.execute(
            `
                INSERT INTO \`User\`
                    (id, email, name, password, role, statusReview, createdAt, updatedAt)
                VALUES
                    (?, 'admin@dcms.com', 'Super Admin DCMS', ?, 'ADMIN', 'NONE', NOW(3), NOW(3))
                ON DUPLICATE KEY UPDATE
                    password = VALUES(password),
                    role = 'ADMIN',
                    updatedAt = NOW(3)
            `,
            [randomUUID(), hashedPassword],
        );

        console.log("✅ BERHASIL! Akun Admin siap digunakan:");
        console.log("- Email: admin@dcms.com");
        console.log("- Pass : admin123");
    } catch (error) {
        console.error("❌ GAGAL:", error.message);
    } finally {
        await pool.end();
    }
}

run();
