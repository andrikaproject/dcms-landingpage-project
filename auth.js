import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";
import { comparePassword } from "@/lib/utils";
import { findBitunixUserByIdentifier } from "@/lib/bitunix-users";
import { findUserByEmail } from "@/lib/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                uid: { label: "UID Bitunix", type: "text" },
                loginIdentifier: { label: "UID Bitunix / Username", type: "text" },
            },
            async authorize(credentials) {
                const bitunixIdentifier = String(
                    credentials?.loginIdentifier || credentials?.uid || ""
                ).trim();
                const password = String(credentials?.password || "");

                if (bitunixIdentifier) {
                    if (!password) {
                        console.log("❌ BITUNIX LOGIN FAILED: Missing password");
                        return null;
                    }

                    try {
                        const bitunixUser = await findBitunixUserByIdentifier(bitunixIdentifier);

                        if (bitunixUser) {
                            const isPasswordMatch = comparePassword(password, bitunixUser.passwordHash);
                            if (!isPasswordMatch) {
                                console.log("❌ BITUNIX LOGIN FAILED: Password mismatch");
                                return null;
                            }
                            console.log("✅ BITUNIX LOGIN SUCCESS:", bitunixUser.uuidBitunix);
                            return {
                                id: bitunixUser.id,
                                name: bitunixUser.name || `UID ${bitunixUser.uuidBitunix}`,
                                email: bitunixUser.email,
                                role: bitunixUser.role || "BITUNIX",
                                uuidBitunix: bitunixUser.uuidBitunix,
                            };
                        }

                        // Fallback: internal User table by email (admin/staff)
                        if (bitunixIdentifier.includes("@")) {
                            const internalUser = await findUserByEmail(bitunixIdentifier);
                            if (internalUser && internalUser.password) {
                                const isPasswordMatch = comparePassword(password, internalUser.password);
                                if (!isPasswordMatch) {
                                    console.log("❌ INTERNAL LOGIN FAILED: Password mismatch");
                                    return null;
                                }
                                console.log("✅ INTERNAL LOGIN SUCCESS:", internalUser.email, "Role:", internalUser.role);
                                return {
                                    id: internalUser.id,
                                    name: internalUser.name,
                                    email: internalUser.email,
                                    role: internalUser.role,
                                };
                            }
                        }

                        console.log("❌ LOGIN FAILED: UID, username, or email not registered");
                        return null;
                    } catch (error) {
                        console.error("Login Error:", error);
                        return null;
                    }
                }

                if (!credentials?.email || !credentials?.password) {
                    console.log("❌ LOGIN FAILED: Missing credentials");
                    return null;
                }

                try {
                    console.log("🔍 ATTEMPTING LOGIN FOR:", credentials.email);
                    const user = await findUserByEmail(credentials.email);

                    if (!user) {
                        console.log("❌ LOGIN FAILED: User not found in database");
                        return null;
                    }

                    if (!user.password) {
                        console.log("❌ LOGIN FAILED: User has no password set");
                        return null;
                    }

                    console.log("🔑 CHECKING PASSWORD...");
                    const isPasswordMatch = await comparePassword(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordMatch) {
                        console.log("❌ LOGIN FAILED: Password mismatch");
                        return null;
                    }

                    console.log("✅ LOGIN SUCCESS:", user.email, "Role:", user.role);
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    };
                } catch (error) {
                    console.error("Database Error:", error);
                    return null;
                }
            },
        }),
    ],
    secret: process.env.AUTH_SECRET,
});
