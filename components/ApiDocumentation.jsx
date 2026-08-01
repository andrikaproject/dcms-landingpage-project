"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CaretDown, Check, Copy, MagnifyingGlass, X } from "@phosphor-icons/react";
import { API_CATEGORIES } from "@/lib/api-documentation";

const methodColors = {
    GET: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    POST: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    PUT: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    DELETE: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    "GET / POST": "border-violet-400/30 bg-violet-400/10 text-violet-300",
};

function MethodBadge({ method }) {
    return <span className={`inline-flex shrink-0 rounded border px-2 py-1 font-mono text-[11px] font-bold ${methodColors[method] || "border-zinc-700 bg-zinc-800 text-zinc-300"}`}>{method}</span>;
}

function CopyButton({ value }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            window.prompt("Salin teks berikut:", value);
        }
    }

    return (
        <button type="button" onClick={copy} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 font-chakra text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white" aria-label="Salin contoh request">
            {copied ? <Check size={14} className="text-[#B7FB5B]" /> : <Copy size={14} />}
            {copied ? "Tersalin" : "Salin"}
        </button>
    );
}

function FieldTable({ title, fields }) {
    if (!fields?.length) return null;

    return (
        <section>
            <h3 className="mb-2 font-chakra text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{title}</h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="min-w-[620px] w-full text-left font-chakra text-xs">
                    <thead className="bg-white/[0.025] text-zinc-500">
                        <tr>
                            {["Field", "Tipe", "Wajib", "Default", "Keterangan"].map((label) => <th key={label} className="px-3 py-2 font-bold">{label}</th>)}
                        </tr>
                    </thead>
                    <tbody className="text-zinc-300">
                        {fields.map(([name, type, required, defaultValue, description]) => (
                            <tr key={name} className="border-t border-zinc-800/80">
                                <td className="px-3 py-2 font-mono text-[#B7FB5B]">{name}</td>
                                <td className="px-3 py-2 font-mono text-zinc-400">{type}</td>
                                <td className="px-3 py-2">{required}</td>
                                <td className="px-3 py-2 font-mono text-zinc-400">{defaultValue}</td>
                                <td className="px-3 py-2 text-zinc-400">{description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function CodeBlock({ title, value, copyValue }) {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return (
        <section>
            <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-chakra text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{title}</h3>
                <CopyButton value={copyValue || text} />
            </div>
            <pre className="max-h-[360px] overflow-auto rounded-lg border border-zinc-800 bg-black/45 p-4 font-mono text-xs leading-5 text-zinc-300"><code>{text}</code></pre>
        </section>
    );
}

function buildCurl(endpoint) {
    const url = `https://api.example.com${endpoint.expressPath.replace(/\{[^}]+\}/g, "BTCUSDT")}`;
    const lines = [`curl -X ${endpoint.method.includes("POST") && !endpoint.method.includes("GET") ? "POST" : endpoint.method.split(" ")[0]} '${url}'`, "  -H 'Accept: application/json'"];
    if (endpoint.access === "Authenticated" || endpoint.access === "Admin") lines.push("  -H 'Authorization: Bearer <access_token>'");
    if (endpoint.body?.length) lines.push("  -H 'Content-Type: application/json'", "  -d '{\"example\": \"value\"}'");
    return lines.join(` ${String.fromCharCode(92)}\n`);
}

function EndpointCard({ endpoint, open, onToggle }) {
    const curl = buildCurl(endpoint);
    return (
        <article className="overflow-hidden rounded-xl border border-zinc-800 bg-[#101215]/90 transition hover:border-zinc-700">
            <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left sm:items-center sm:p-5" aria-expanded={open}>
                <MethodBadge method={endpoint.method} />
                <div className="min-w-0 flex-1">
                    <p className="break-all font-mono text-sm font-bold text-white">{endpoint.currentPath}</p>
                    <p className="mt-1 text-sm text-zinc-500">{endpoint.summary}</p>
                </div>
                <CaretDown size={18} className={`mt-1 shrink-0 text-zinc-500 transition-transform sm:mt-0 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="border-t border-zinc-800 px-4 pb-5 pt-4 sm:px-5">
                    <div className="mb-6 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-zinc-800 bg-black/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Express target</p><p className="mt-1 break-all font-mono text-xs text-[#B7FB5B]">{endpoint.expressPath}</p></div>
                        <div className="rounded-lg border border-zinc-800 bg-black/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Akses</p><p className="mt-1 text-xs font-bold text-zinc-200">{endpoint.access}</p></div>
                        <div className="rounded-lg border border-zinc-800 bg-black/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Rate limit</p><p className="mt-1 text-xs text-zinc-300">{endpoint.rateLimit}</p></div>
                    </div>
                    <div className="space-y-6">
                        <FieldTable title="Query parameter" fields={endpoint.query} />
                        <FieldTable title="Request body" fields={endpoint.body} />
                        <div className="grid gap-6 xl:grid-cols-2">
                            <CodeBlock title="Response sukses" value={endpoint.success} />
                            <CodeBlock title="Contoh cURL (Express)" value={curl} copyValue={curl} />
                        </div>
                        <section>
                            <h3 className="mb-2 font-chakra text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Error yang ditangani</h3>
                            <div className="flex flex-wrap gap-2">{endpoint.errors.map((error) => <span key={error} className="rounded border border-rose-400/15 bg-rose-400/5 px-2 py-1 font-mono text-[11px] text-rose-200">{error}</span>)}</div>
                        </section>
                        {endpoint.notes && <p className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100/80"><span className="font-bold text-amber-200">Catatan migrasi: </span>{endpoint.notes}</p>}
                    </div>
                </div>
            )}
        </article>
    );
}

export default function ApiDocumentation({ endpoints }) {
    const [category, setCategory] = useState("All");
    const [search, setSearch] = useState("");
    const [openId, setOpenId] = useState(null);
    const normalizedSearch = search.trim().toLowerCase();
    const visibleEndpoints = useMemo(() => endpoints.filter((endpoint) => {
        const matchesCategory = category === "All" || endpoint.category === category;
        const searchable = [endpoint.currentPath, endpoint.expressPath, endpoint.summary, endpoint.method, endpoint.category, endpoint.access].join(" ").toLowerCase();
        return matchesCategory && (!normalizedSearch || searchable.includes(normalizedSearch));
    }), [category, endpoints, normalizedSearch]);

    return (
        <div className="min-h-dvh bg-black p-4 font-chakra text-white sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">
                <header className="border-b border-zinc-800 pb-6">
                    <Link href="/dashboard/admin/users" className="mb-3 inline-flex min-h-9 items-center text-sm text-blue-400 transition hover:text-blue-300 hover:underline">← Kembali ke Management User</Link>
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                        <div>
                            <p className="font-chakra text-xs font-bold uppercase tracking-[0.28em] text-[#B7FB5B]">Internal reference</p>
                            <h1 className="mt-2 font-nebulica text-[clamp(1.8rem,1.35rem+2vw,3rem)] font-bold leading-none">API Documentation</h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">Kontrak seluruh endpoint DCMS saat ini, disusun untuk migrasi frontend Next.js ke backend Express.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs sm:flex">
                            <div className="rounded-lg border border-[#B7FB5B]/20 bg-[#B7FB5B]/[0.04] px-3 py-2 text-zinc-300"><b className="text-[#B7FB5B]">{endpoints.length}</b> operasi</div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-zinc-300"><b className="text-white">/v1</b> target Express</div>
                        </div>
                    </div>
                </header>

                <section className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Authentication sekarang</p><p className="mt-2 text-sm leading-5 text-zinc-300">NextAuth session/cookie; route administratif memerlukan role <b className="text-white">ADMIN</b>.</p></div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Target Express</p><p className="mt-2 text-sm leading-5 text-zinc-300">Gunakan namespace <b className="font-mono text-[#B7FB5B]">/v1</b> dan pilih token/session sebagai mekanisme autentikasi.</p></div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Rate limit</p><p className="mt-2 text-sm leading-5 text-zinc-300">Saat ini in-memory per user/IP; gunakan shared store sebelum deploy multi-instance.</p></div>
                </section>

                <section className="mt-8">
                    <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {API_CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-md px-3 py-2 text-xs font-bold transition ${category === item ? "bg-[#B7FB5B] text-black" : "border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"}`}>{item}</button>)}
                        </div>
                        <label className="flex min-h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 lg:w-80 focus-within:border-zinc-500">
                            <MagnifyingGlass size={16} className="text-zinc-500" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari path, method, atau akses…" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" />
                            {search && <button type="button" onClick={() => setSearch("")} className="text-zinc-500 hover:text-white" aria-label="Hapus pencarian"><X size={15} /></button>}
                        </label>
                    </div>
                    <div className="mt-5 space-y-3">
                        {visibleEndpoints.map((endpoint) => <EndpointCard key={endpoint.id} endpoint={endpoint} open={openId === endpoint.id} onToggle={() => setOpenId((current) => current === endpoint.id ? null : endpoint.id)} />)}
                        {visibleEndpoints.length === 0 && <div className="rounded-xl border border-dashed border-zinc-800 px-5 py-12 text-center"><p className="text-sm text-zinc-400">Tidak ada endpoint yang cocok.</p><button type="button" onClick={() => { setCategory("All"); setSearch(""); }} className="mt-3 text-xs font-bold text-[#B7FB5B] hover:underline">Reset filter</button></div>}
                    </div>
                </section>
            </div>
        </div>
    );
}
