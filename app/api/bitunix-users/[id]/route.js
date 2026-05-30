import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-gateway";
import {
    deleteBitunixUser,
    findBitunixUserByEmail,
    findBitunixUserById,
    updateBitunixUser,
} from "@/lib/bitunix-users";

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toPublicUser(user) {
    const publicUser = { ...user };
    delete publicUser.passwordHash;
    return publicUser;
}

export async function GET(_request, { params }) {
    const { response } = await requireApiAdmin();
    if (response) return response;

    const { id } = await params;
    const user = await findBitunixUserById(id);

    if (!user) {
        return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ user: toPublicUser(user) });
}

export async function PUT(request, { params }) {
    const { response } = await requireApiAdmin();
    if (response) return response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const email = body.email === undefined ? undefined : String(body.email).trim().toLowerCase();
    const name = body.name === undefined ? undefined : String(body.name).trim();
    const password = body.password === undefined ? undefined : String(body.password);

    if (email !== undefined && !isValidEmail(email)) {
        return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }

    if (password !== undefined && password.length > 0 && password.length < 8) {
        return NextResponse.json(
            { error: "Password minimal 8 karakter." },
            { status: 400 }
        );
    }

    const currentUser = await findBitunixUserById(id);

    if (!currentUser) {
        return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    if (email && email !== currentUser.email) {
        const existingEmail = await findBitunixUserByEmail(email);

        if (existingEmail) {
            return NextResponse.json(
                { error: "Email sudah terdaftar." },
                { status: 409 }
            );
        }
    }

    const user = await updateBitunixUser(id, { email, name, password });

    return NextResponse.json({ success: "User berhasil diperbarui.", user: toPublicUser(user) });
}

export async function DELETE(_request, { params }) {
    const { response } = await requireApiAdmin();
    if (response) return response;

    const { id } = await params;
    const deleted = await deleteBitunixUser(id);

    if (!deleted) {
        return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: "User berhasil dihapus." });
}
