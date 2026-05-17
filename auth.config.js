const authConfig = {
    providers: [], // Providers akan diisi di auth.js yang spesifik runtime Node
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.uuidBitunix = user.uuidBitunix;
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.role) session.user.role = token.role;
            if (token?.uuidBitunix) session.user.uuidBitunix = token.uuidBitunix;
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
};

export default authConfig;
