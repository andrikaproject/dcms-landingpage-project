require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log("⏳ Hashing password...");
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    console.log("🔐 Generated Hash:", hashedPassword);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@dcms.com' },
        update: {
            password: hashedPassword,
        },
        create: {
            email: 'admin@dcms.com',
            name: 'Super Admin DCMS',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log("✅ SEED BERHASIL! Akun Admin:", admin.email);

    const user = await prisma.user.upsert({
        where: { email: 'user@dcms.com' },
        update: {
            password: bcrypt.hashSync('user123', 10),
            role: 'USER',
        },
        create: {
            email: 'user@dcms.com',
            name: 'Regular User DCMS',
            password: bcrypt.hashSync('user123', 10),
            role: 'USER',
        },
    });

    console.log("✅ SEED BERHASIL! Akun User Regular:", user.email);

    const andrika = await prisma.user.upsert({
        where: { email: 'andrika@dcms.com' },
        update: {
            password: bcrypt.hashSync('andrika123', 10),
            role: 'ADMIN',
        },
        create: {
            email: 'andrika@dcms.com',
            name: 'Andrika DCMS',
            password: bcrypt.hashSync('andrika123', 10),
            role: 'ADMIN',
        },
    });

    console.log("✅ SEED BERHASIL! Akun Andrika:", andrika.email);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error("❌ SEED GAGAL:", e);
        await prisma.$disconnect();
        process.exit(1);
    });
