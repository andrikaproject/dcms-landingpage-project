import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the database.");
}

const pool = mysql.createPool({ uri: databaseUrl });

async function upsertUser({ email, name, password, role }) {
    const hashedPassword = bcrypt.hashSync(password, 10);

    await pool.execute(
        `
            INSERT INTO \`User\`
                (id, email, name, password, role, statusReview, createdAt, updatedAt)
            VALUES
                (?, ?, ?, ?, ?, 'NONE', NOW(3), NOW(3))
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                password = VALUES(password),
                role = VALUES(role),
                updatedAt = NOW(3)
        `,
        [randomUUID(), email, name, hashedPassword, role],
    );

    return { email };
}

async function main() {
    console.log("Seeding DCMS users...");

    const admin = await upsertUser({
        email: "admin@dcms.com",
        name: "Super Admin DCMS",
        password: "admin123",
        role: "ADMIN",
    });
    console.log("Seeded admin:", admin.email);

    const user = await upsertUser({
        email: "user@dcms.com",
        name: "Regular User DCMS",
        password: "user123",
        role: "USER",
    });
    console.log("Seeded regular user:", user.email);

    const andrika = await upsertUser({
        email: "andrika@dcms.com",
        name: "Andrika DCMS",
        password: "andrika123",
        role: "ADMIN",
    });
    console.log("Seeded Andrika:", andrika.email);
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
