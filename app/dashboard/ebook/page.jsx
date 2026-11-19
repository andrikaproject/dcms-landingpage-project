import DashboardShell from "@/components/DashboardShell";
import EbookCatalog from "@/components/ebooks/EbookCatalog";

export const metadata = { title: "Ebook DCMS" };

export default function EbookPage() {
    return (
        <DashboardShell>
            <EbookCatalog />
        </DashboardShell>
    );
}
