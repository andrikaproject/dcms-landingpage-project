require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://casaos:casaos@192.168.0.103:5432/casaos?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
    console.log("⏳ Sedang mendaftarkan Admin...");
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    try {
        const admin = await prisma.user.upsert({
            where: { email: 'admin@dcms.com' },
            update: {},
            create: {
                email: 'admin@dcms.com',
                name: 'Super Admin DCMS',
                password: hashedPassword,
                role: 'ADMIN',
            },
        });
        console.log("✅ BERHASIL! Akun Admin siap digunakan:");
        console.log("- Email: " + admin.email);
        console.log("- Pass : admin123");
    } catch (error) {
        console.error("❌ GAGAL:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();