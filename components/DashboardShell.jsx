"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 88;

const NAV_ITEMS = [
    { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
    { icon: "chart", label: "Market Analysis", href: "/dashboard/market-analysis" },
    { icon: "ebook", label: "Ebook DCMS", href: "/dashboard/ebook" },
    { icon: "bot", label: "Bots", href: "/dashboard/bots" },
];

function Icon({ name }) {
    const iconProps = {
        width: 20,
        height: 20,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
    };

    const paths = {
        dashboard: (
            <>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
            </>
        ),
        chart: (
            <>
                <path d="M3 3v18h18" />
                <path d="m7 15 4-4 3 3 5-7" />
            </>
        ),
        ebook: (
            <>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
            </>
        ),
        bot: (
            <>
                <rect x="5" y="8" width="14" height="10" rx="3" />
                <path d="M12 8V4" />
                <path d="M9 13h.01" />
                <path d="M15 13h.01" />
                <path d="M8 20h8" />
            </>
        ),
        panel: (
            <>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M9 4v16" />
            </>
        ),
        chevronLeft: <path d="m15 18-6-6 6-6" />,
        chevronRight: <path d="m9 18 6-6-6-6" />,
    };

    return <svg {...iconProps}>{paths[name]}</svg>;
}

function LogoMark() {
    return (
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#B7FB5B]/40 bg-[#B7FB5B] shadow-[0_1px_4px_rgba(183,251,91,0.2)]">
            <Image
                src="/images/logo-dcms.svg"
                alt=""
                width={24}
                height={24}
                className="object-contain brightness-0"
            />
        </div>
    );
}

function isNavActive(pathname, href) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ icon, label, href, active = false, collapsed }) {
    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            className={`flex h-12 w-full items-center rounded-[6px] py-2 font-chakra text-sm font-semibold leading-5 transition ${collapsed ? "justify-center px-0" : "gap-3 px-2"} ${active
                ? "border border-[#36353d] bg-gradient-to-b from-[#25242a] to-[#17161c] text-white shadow-[0_1px_2px_rgba(20,21,26,0.05)]"
                : "text-[#949398] hover:bg-white/[0.03] hover:text-white"
                }`}
        >
            <span className={`grid size-5 shrink-0 place-items-center ${active ? "text-white [&>svg]:size-[18px]" : "text-[#949398] [&>svg]:size-[18px]"}`}>
                <Icon name={icon} />
            </span>
            <span className={`min-w-0 flex-1 truncate transition ${collapsed ? "sr-only" : "opacity-100"}`}>
                {label}
            </span>
        </Link>
    );
}

function Sidebar({ collapsed, onToggle, user, logoutSlot, pathname }) {
    return (
        <aside
            className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[#14131c] bg-[#07060e] py-5 transition-[width,padding] duration-300 ease-out lg:flex"
            style={{
                width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
                paddingLeft: collapsed ? 16 : 24,
                paddingRight: collapsed ? 16 : 24,
                boxSizing: "border-box",
            }}
        >
            <div className={`flex items-center border-b border-dashed border-[#313040] pb-5 ${collapsed ? "justify-center" : "justify-between"}`}>
                <div className="flex min-w-0 items-center gap-3">
                    <LogoMark />
                    <span className={`font-nebulica text-xl font-bold text-white transition ${collapsed ? "sr-only" : "opacity-100"}`}>
                        DCMS
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    className={`grid size-7 shrink-0 place-items-center rounded-full bg-[#25242a] text-[#949398] transition hover:text-white ${collapsed ? "absolute -right-3 top-6 border border-[#36353d]" : ""}`}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!collapsed}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
                </button>
            </div>

            <nav className="mt-6 flex flex-1 flex-col gap-2">
                <p className={`mb-1 text-xs text-[#949398] transition ${collapsed ? "sr-only" : "opacity-100"}`}>Main Menu</p>
                {NAV_ITEMS.map((item) => (
                    <NavItem
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        href={item.href}
                        active={isNavActive(pathname, item.href)}
                        collapsed={collapsed}
                    />
                ))}
            </nav>

            <div className={`flex items-center gap-3 ${collapsed ? "flex-col justify-center" : "justify-between"}`}>
                <div className={`flex min-w-0 items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
                    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#23222f] p-1">
                        <div className="grid size-10 place-items-center rounded-full bg-[#B7FB5B] text-sm font-black text-black">
                            {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
                        </div>
                    </div>
                    <div className={`min-w-0 font-chakra transition ${collapsed ? "sr-only" : "opacity-100"}`}>
                        <p className="truncate text-sm font-bold text-white">{user.name || "Member"}</p>
                        <p className="truncate text-xs text-[#949398]">{user.uuidBitunix || user.role}</p>
                    </div>
                </div>
                {logoutSlot}
            </div>
        </aside>
    );
}

function MobileNav({ logoutSlot, pathname }) {
    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#14131c] bg-[#07060e]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
            <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold leading-none transition ${isNavActive(pathname, item.href)
                            ? "border border-[#36353d] bg-gradient-to-b from-[#25242a] to-[#17161c] text-white"
                            : "text-[#949398] hover:bg-white/[0.03] hover:text-white"
                            }`}
                    >
                        <span className="[&>svg]:size-[18px]">
                            <Icon name={item.icon} />
                        </span>
                        <span className="max-w-full truncate">{item.label.split(" ")[0]}</span>
                    </Link>
                ))}
                <div className="grid min-h-12 place-items-center">
                    {logoutSlot}
                </div>
            </div>
        </nav>
    );
}

export default function DashboardShell({ user, logoutSlot, children }) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    return (
        <div
            className="min-h-dvh bg-[#050505] text-white"
            style={{
                "--sidebar-width": `${sidebarWidth}px`,
            }}
        >
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed((current) => !current)}
                user={user}
                logoutSlot={logoutSlot}
                pathname={pathname}
            />
            <main
                className="min-h-dvh bg-gradient-to-b from-[#23252a] to-[#111315] pb-24 transition-[padding-left] duration-300 ease-out lg:pb-0 lg:pl-[var(--sidebar-width)]"
            >
                {children}
            </main>
            <MobileNav logoutSlot={logoutSlot} pathname={pathname} />
        </div>
    );
}
