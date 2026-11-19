"use client";

import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthProvider";
import EbookEditor from "@/components/ebooks/admin/EbookEditor";

export default function AdminEbookPage() {
    const { ebookId } = useParams();
    return (
        <AuthGuard admin>
            <EbookEditor key={ebookId} ebookId={ebookId} />
        </AuthGuard>
    );
}
