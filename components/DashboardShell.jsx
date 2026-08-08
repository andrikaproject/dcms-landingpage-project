"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AnimatedDashboardIcon from "@/components/AnimatedDashboardIcon";
import { AuthGuard, useAuth } from "@/components/auth/AuthProvider";
import LogoutButton from "@/components/auth/LogoutButton";
import {
    House,
    ArrowsLeftRight,
    CurrencyCircleDollar,
    Robot,
    SidebarSimple,
    CaretRight,
} from "@phosphor-icons/react";

// Sidebar matched to Figma "DCMS - Project Assign" (node 2255:34453).
// Collapse, active-route and mobile behaviors are preserved from the previous
// shell (they are not represented in the static Figma frame).
// Width is narrowed from the 302px Figma frame to reclaim content space while
// still fitting the longest label ("Market Analysis") at 16px.
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 88;

const NAV_ITEMS = [
    { Icon: House, label: "Dashboard", href: "/dashboard", animated: true },
    { Icon: ArrowsLeftRight, label: "Market Analysis", href: "/dashboard/market-analysis" },
    { Icon: CurrencyCircleDollar, label: "Ebook DCMS", href: "/dashboard/ebook" },
    { Icon: Robot, label: "Bots", href: "/dashboard/bots" },
];

function LogoMark() {
    // Figma: solid lime fill (#B7FB5B) with lime border (#BDEF7A), radius 8,
    // blue-tinted drop shadow + inset white bottom highlight, opacity 0.92.
    // The DCMS mark asset is white, so brightness-0 renders it black on the lime.
    return (
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#BDEF7A] bg-[#B7FB5B] p-2 opacity-[0.92] shadow-[0_1px_4px_0_rgba(66,138,255,0.2),inset_0_-2px_4px_-1px_#ffffff]">
            <Image
                src="/images/logo-dcms.svg"
                alt=""
                width={20}
                height={20}
                className="size-5 object-contain brightness-0"
            />
        </div>
    );
}

function isNavActive(pathname, href) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ Icon, label, href, active = false, collapsed, animated = false }) {
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            onPointerEnter={() => animated && setHovered(true)}
            onPointerLeave={() => animated && setHovered(false)}
            className={`flex h-10 w-full items-center overflow-hidden rounded-lg font-chakra text-base leading-6 transition ${collapsed ? "justify-center px-0" : "gap-2 px-3"} ${active
                ? "bg-gradient-to-r from-white/40 to-transparent font-bold text-white"
                : "font-medium text-[#5C5C5C] hover:bg-white/[0.03] hover:text-white"
                }`}
        >
            {animated ? (
                <AnimatedDashboardIcon
                    playing={hovered}
                    size={16}
                    fallbackWeight={active ? "bold" : "regular"}
                />
            ) : (
                <Icon
                    size={16}
                    weight={active ? "bold" : "regular"}
                    className="shrink-0"
                    aria-hidden
                />
            )}
            <span className={`min-w-0 flex-1 truncate ${collapsed ? "sr-only" : "opacity-100"}`}>
                {label}
            </span>
        </Link>
    );
}

function Sidebar({ collapsed, onToggle, user, logoutSlot, pathname }) {
    return (
        <aside
            className="fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#0A0D12] transition-[width] duration-300 ease-out lg:flex"
            style={{
                width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
                boxSizing: "border-box",
            }}
        >
            {/* Decorative atmospheric glows (Figma ellipses 2392 / 2393). */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-16 left-1/2 h-24 w-44 -translate-x-1/2 rounded-full bg-white/10 blur-[70px]" />
                <div className="absolute bottom-44 -left-16 h-16 w-44 rounded-full bg-white/[0.07] blur-[80px]" />
            </div>

            {/* Header: logo + collapse toggle */}
            <div
                className={`relative z-10 flex h-[88px] shrink-0 items-center gap-3 px-4 ${collapsed ? "justify-center" : "justify-between"}`}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <LogoMark />
                    <div className={`flex min-w-0 flex-col justify-center gap-0.5 whitespace-nowrap ${collapsed ? "sr-only" : ""}`}>
                        <span className="truncate font-nebulica text-[10px] font-bold leading-[8px] text-[#878787] opacity-40">
                            Diskusi Crypto Micin Saham
                        </span>
                        <span className="font-chakra text-base font-bold leading-6 text-white">
                            DCMS
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    className={`grid size-7 shrink-0 place-items-center rounded-md text-[#A3A3A3] transition hover:text-white ${collapsed ? "absolute -right-3 top-8 border border-white/10 bg-[#14171d]" : ""}`}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!collapsed}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <CaretRight size={16} aria-hidden /> : <SidebarSimple size={20} aria-hidden />}
                </button>
            </div>

            {/* Content: main menu */}
            <nav className="relative z-10 flex flex-1 flex-col gap-3 px-4 py-2">
                <div className="flex flex-col gap-0.5">
                    <p className={`px-3 pb-2 text-[12px] font-medium uppercase leading-4 tracking-[0.48px] text-[#A3A3A3] ${collapsed ? "sr-only" : ""}`}>
                        Main Menu
                    </p>
                    {NAV_ITEMS.map((item) => (
                        <NavItem
                            key={item.label}
                            Icon={item.Icon}
                            label={item.label}
                            href={item.href}
                            active={isNavActive(pathname, item.href)}
                            collapsed={collapsed}
                            animated={item.animated}
                        />
                    ))}
                </div>
            </nav>

            {/* Footer: user + copyright */}
            <div className="relative z-10 flex shrink-0 flex-col items-center gap-3 p-4">
                <div className={`flex w-full items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#CFD4D7] text-xs font-bold text-[#0A0D12]">
                        {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className={`min-w-0 flex-1 font-chakra ${collapsed ? "sr-only" : ""}`}>
                        <p className="truncate text-xs font-bold leading-4 text-white">{user.name || "Member"}</p>
                        <p className="truncate text-xs font-normal leading-4 text-[#7B7B7B]">{user.uuidBitunix || user.role}</p>
                    </div>
                    {!collapsed && logoutSlot}
                </div>
                {collapsed && logoutSlot}
                {!collapsed && (
                    <>
                        <div className="h-px w-full bg-white/10" />
                        <p className="w-full text-xs font-bold leading-4 text-[#7B7B7B]">© {new Date().getFullYear()} DCMS</p>
                    </>
                )}
            </div>
        </aside>
    );
}

function MobileNav({ logoutSlot, pathname }) {
    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0A0D12]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
            <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
                {NAV_ITEMS.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    const ItemIcon = item.Icon;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold leading-none transition ${active
                                ? "border border-white/10 bg-gradient-to-r from-white/40 to-transparent text-white"
                                : "text-[#5C5C5C] hover:bg-white/[0.03] hover:text-white"
                                }`}
                        >
                            {item.animated ? (
                                <AnimatedDashboardIcon
                                    size={18}
                                    fallbackWeight={active ? "bold" : "regular"}
                                />
                            ) : (
                                <ItemIcon size={18} weight={active ? "bold" : "regular"} aria-hidden />
                            )}
                            <span className="max-w-full truncate">{item.label.split(" ")[0]}</span>
                        </Link>
                    );
                })}
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
    const auth = useAuth();
    const resolvedUser = user || auth.user || { name: "Member", email: "", role: "USER" };
    const resolvedLogoutSlot = logoutSlot || <LogoutButton compact />;

    const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    return (
        <AuthGuard>
        <div
            className="min-h-dvh bg-[#050505] text-white"
            style={{
                "--sidebar-width": `${sidebarWidth}px`,
            }}
        >
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed((current) => !current)}
                user={resolvedUser}
                logoutSlot={resolvedLogoutSlot}
                pathname={pathname}
            />
            <main
                className="min-h-dvh bg-gradient-to-b from-[#23252a] to-[#111315] pb-24 transition-[padding-left] duration-300 ease-out lg:pb-0 lg:pl-[var(--sidebar-width)]"
            >
                {children}
            </main>
            <MobileNav logoutSlot={resolvedLogoutSlot} pathname={pathname} />
        </div>
        </AuthGuard>
    );
}
