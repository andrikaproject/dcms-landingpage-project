"use client";

import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthProvider";
import ProgressReport from "@/components/ebooks/admin/ProgressReport";

export default function AdminEbookProgressPage() {
    const { ebookId } = useParams();
    return (
        <AuthGuard admin>
            <ProgressReport key={ebookId} ebookId={ebookId} />
        </AuthGuard>
    );
}
