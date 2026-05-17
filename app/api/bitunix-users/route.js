import { NextResponse } from "next/server";
import { listBitunixUsers } from "@/lib/bitunix-users";

export async function GET() {
    try {
        return NextResponse.json({ users: await listBitunixUsers() });
    } catch (error) {
        console.error("Bitunix Users List Error:", error);

        return NextResponse.json(
            { error: "Tidak bisa mengambil data user Bitunix." },
            { status: 500 }
        );
    }
}
