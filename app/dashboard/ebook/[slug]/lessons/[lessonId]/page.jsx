import DashboardShell from "@/components/DashboardShell";
import LessonReader from "@/components/ebooks/LessonReader";

export const metadata = { title: "Ebook DCMS" };

export default async function EbookLessonPage({ params }) {
    const { slug, lessonId } = await params;
    return (
        <DashboardShell>
            <LessonReader key={`${slug}:${lessonId}`} slug={slug} lessonId={lessonId} />
        </DashboardShell>
    );
}
