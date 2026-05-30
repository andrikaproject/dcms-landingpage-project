"use client";

import { createContext, useContext, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";

const DashboardFormLoadingContext = createContext(false);

function DashboardLoadingFormState({
    children,
    action = "/dashboard",
    method = "get",
    className = "",
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    return (
        <DashboardFormLoadingContext.Provider value={isPending}>
            <form
                action={action}
                method={method}
                className={className}
                onSubmit={(event) => {
                    event.preventDefault();

                    const form = event.currentTarget;
                    const formData = new FormData(form);
                    const nextSearchParams = new URLSearchParams();

                    for (const [key, value] of formData.entries()) {
                        nextSearchParams.append(key, String(value));
                    }

                    const nextUrl = `${action}?${nextSearchParams.toString()}`;
                    const currentUrl = `${pathname}?${searchParams.toString()}`;

                    startTransition(() => {
                        if (nextUrl === currentUrl) {
                            router.refresh();
                            return;
                        }

                        router.push(nextUrl);
                    });
                }}
            >
                {children}
            </form>
        </DashboardFormLoadingContext.Provider>
    );
}

export function DashboardLoadingForm(props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const navigationKey = `${pathname}?${searchParams.toString()}`;

    return <DashboardLoadingFormState key={navigationKey} {...props} />;
}

export default function DashboardSubmitButton({
    children,
    loadingLabel = "Loading...",
    className = "",
    textClassName = "",
    textStyle,
}) {
    const { pending } = useFormStatus();
    const formSubmitting = useContext(DashboardFormLoadingContext);
    const isLoading = pending || formSubmitting;

    return (
        <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
        >
            {isLoading ? (
                <span className={`flex items-center gap-2 ${textClassName}`} style={textStyle}>
                    <span className="h-4 w-4 rounded-full border-2 border-current/25 border-t-current motion-safe:animate-spin" />
                    {loadingLabel}
                </span>
            ) : (
                <span className={textClassName} style={textStyle}>
                    {children}
                </span>
            )}
        </button>
    );
}
