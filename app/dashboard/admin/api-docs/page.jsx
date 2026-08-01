import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ApiDocumentation from "@/components/ApiDocumentation";
import { API_DOCUMENTATION } from "@/lib/api-documentation";

export const metadata = { title: "API Documentation — Admin" };

export default async function AdminApiDocumentationPage() {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    return <ApiDocumentation endpoints={API_DOCUMENTATION} />;
}
