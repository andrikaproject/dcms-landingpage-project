import DashboardShell from "@/components/DashboardShell";
import MarketAnalysisWorkspace from "./MarketAnalysisWorkspace";

export const metadata = {
    title: "Market Analysis | DCMS",
    description: "Konteks level PDH, PDL, PWH, dan PWL dari Bitunix futures.",
};

export default function MarketAnalysisPage() {
    return (
        <DashboardShell>
            <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
                <MarketAnalysisWorkspace />
            </div>
        </DashboardShell>
    );
}
