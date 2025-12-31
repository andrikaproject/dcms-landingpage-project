"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "../../components/Button";

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkUserAndFetchData = async () => {
            // 1. Cek User
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            setUser(user);

            // 2. Ambil Data Sinyal
            const { data, error } = await supabase
                .from('signals')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error) setSignals(data);
            setLoading(false);
        };

        checkUserAndFetchData();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) return <div className="bg-brand-dark min-h-screen text-white p-10">Loading...</div>;

    return (
        <div className="min-h-screen bg-brand-dark text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header Dashboard */}
                <div className="flex justify-between items-center mb-8 bg-brand-card p-6 rounded-crypto border border-gray-800">
                    <div>
                        <h1 className="text-xl font-bold text-brand-primary">Welcome Back, Trader!</h1>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>Logout</Button>
                </div>

                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-8 bg-brand-primary rounded-full"></span>
                    Active Trading Signals
                </h2>

                {/* Grid Sinyal */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {signals.map((sig) => (
                        <div key={sig.id} className="bg-brand-card border border-gray-800 p-6 rounded-crypto hover:border-brand-primary/50 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xl font-bold">{sig.pair}</span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${sig.type === 'LONG' ? 'bg-brand-secondary/20 text-brand-secondary' : 'bg-brand-danger/20 text-brand-danger'
                                    }`}>
                                    {sig.type}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Entry Price</p>
                                    <p className="font-mono text-gray-200">{sig.entry_price}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Target Price</p>
                                    <p className="font-mono text-brand-secondary">{sig.target_price}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                                <span className="text-[10px] text-gray-500 italic">Status: {sig.status}</span>
                                <button className="text-brand-primary text-xs hover:underline font-medium">View Detail →</button>
                            </div>
                        </div>
                    ))}

                    {signals.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-brand-card rounded-crypto border border-dashed border-gray-700">
                            <p className="text-gray-500 italic">Belum ada sinyal aktif hari ini.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}