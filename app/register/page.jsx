"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

// PASTIKAN ADA KATA 'export default' DI DEPAN FUNCTION
export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setMessage("Error: " + error.message);
        } else {
            setMessage("Berhasil! Silakan cek email atau langsung coba login jika email confirmation dimatikan.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <form onSubmit={handleRegister} className="p-8 border border-gray-700 rounded-lg shadow-xl w-96 bg-gray-800">
                <h1 className="text-2xl mb-6 font-bold text-center">Join Crypto Group</h1>

                <div className="mb-4">
                    <label className="block text-sm mb-2">Email Address</label>
                    <input
                        type="email"
                        placeholder="name@example.com"
                        className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm mb-2">Password</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition duration-200">
                    Daftar Sekarang
                </button>

                {message && (
                    <p className="mt-4 text-sm text-center p-2 bg-blue-900/30 border border-blue-500 rounded text-blue-200">
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}