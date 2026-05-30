import Image from "next/image";

export default function DashboardLoading() {
    return (
        <main className="grid min-h-dvh place-items-center bg-black px-6 font-chakra text-white">
            <section className="flex w-[min(100%,420px)] flex-col items-center gap-6 text-center">
                <div className="relative grid h-16 w-16 place-items-center rounded-xl bg-[#B7FB5B] shadow-[0_0_42px_rgba(183,251,91,0.24)]">
                    <Image
                        src="/images/logo-dcms.svg"
                        alt=""
                        width={38}
                        height={38}
                        aria-hidden="true"
                        className="h-10 w-10 invert"
                        priority
                    />
                    <span className="absolute inset-0 rounded-xl border border-[#B7FB5B]/50 motion-safe:animate-ping" />
                </div>

                <div>
                    <p className="font-nebulica text-2xl font-bold">Loading Dashboard</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">
                        Menyiapkan data market dan lock signal.
                    </p>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-2/3 rounded-full bg-[#B7FB5B] motion-safe:animate-[loadingBar_1.2s_ease-in-out_infinite]" />
                </div>
            </section>
        </main>
    );
}
