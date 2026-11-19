import DashboardShell from "@/components/DashboardShell";
import EbookDetail from "@/components/ebooks/EbookDetail";

export const metadata = { title: "Ebook DCMS" };

export default async function EbookDetailPage({ params }) {
    const { slug } = await params;
    return (
        <DashboardShell>
            <EbookDetail key={slug} slug={slug} />
        </DashboardShell>
    );
}
