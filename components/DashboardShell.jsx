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
    ShieldCheck,
    SidebarSimple,
} from "@phosphor-icons/react";

// Shell mengikuti frame Figma "Dashboard - Redesign" (node 2645:1835).
// Perilaku collapse, rute aktif, dan navigasi mobile dipertahankan dari shell
// sebelumnya; tombol collapse pindah ke header seperti di desain.
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 88;

const NAV_ITEMS = [
    { Icon: House, label: "Dashboard", href: "/dashboard", animated: true },
    { Icon: ArrowsLeftRight, label: "Market Analysis", href: "/dashboard/market-analysis" },
    { Icon: CurrencyCircleDollar, label: "Ebook DCMS", href: "/dashboard/ebook" },
    { Icon: Robot, label: "Bots", href: "/dashboard/bots" },
];

// Hanya tampil untuk role ADMIN.
const ADMIN_ITEM = { Icon: ShieldCheck, label: "Panel Admin", short: "Admin", href: "/dashboard/admin" };

function navItemsFor(user) {
    return user?.role === "ADMIN" ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;
}

const EXTRA_CRUMBS = [
    { prefix: "/dashboard/chart", trail: [{ label: "Dashboard", href: "/dashboard" }, { label: "Live chart" }] },
    { prefix: "/dashboard/signals/history", trail: [{ label: "Dashboard", href: "/dashboard" }, { label: "Riwayat signal" }] },
    { prefix: "/dashboard/admin", trail: [{ label: "Panel admin" }] },
];

export function breadcrumbFor(pathname) {
    const extra = EXTRA_CRUMBS.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
    if (extra) return extra.trail;
    const nav = NAV_ITEMS.find((item) => isNavActive(pathname, item.href));
    return [{ label: nav?.label || "Dashboard" }];
}

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
    // Live chart adalah sub-halaman Dashboard, jadi menu Dashboard tetap aktif.
    if (href === "/dashboard") return pathname === href || pathname.startsWith("/dashboard/chart");
    return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ Icon, label, href, active = false, collapsed, animated = false }) {
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            aria-current={active ? "page" : undefined}
            data-press="surface"
            onPointerEnter={() => animated && setHovered(true)}
            onPointerLeave={() => animated && setHovered(false)}
            className={`flex h-9 w-full items-center overflow-hidden rounded-md border p-2 font-chakra text-sm leading-5 transition ${collapsed ? "justify-center" : "gap-2"} ${active
                ? "border-[#36353d] bg-gradient-to-b from-[#25242a] to-[#17161c] font-semibold text-white shadow-[0_1px_2px_rgba(10,13,18,0.3)]"
                : "border-transparent font-normal text-[#949398] hover:bg-white/[0.03] hover:text-white"
                }`}
        >
            {animated ? (
                <AnimatedDashboardIcon
                    playing={hovered}
                    size={20}
                    fallbackWeight={active ? "fill" : "regular"}
                />
            ) : (
                <Icon
                    size={20}
                    weight={active ? "fill" : "regular"}
                    className={`shrink-0 ${active ? "" : "text-[#a2a1a6]"}`}
                    aria-hidden
                />
            )}
            <span className={`min-w-0 flex-1 truncate ${collapsed ? "sr-only" : "opacity-100"}`}>
                {label}
            </span>
        </Link>
    );
}

function Sidebar({ collapsed, user, logoutSlot, pathname }) {
    return (
        <aside
            id="dashboard-sidebar"
            className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#171717] pb-5 transition-[width] duration-300 ease-out lg:flex ${collapsed ? "px-4" : "px-6"}`}
            style={{
                width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
                boxSizing: "border-box",
            }}
        >
            <div className={`flex h-[76px] shrink-0 items-center gap-2 border-b border-dashed border-[#313040] ${collapsed ? "justify-center" : ""}`}>
                <LogoMark />
                <span className={`font-nebulica text-xl font-bold leading-[26px] text-white ${collapsed ? "sr-only" : ""}`}>DCMS</span>
            </div>

            <nav aria-label="Menu utama" className="flex flex-1 flex-col pt-5">
                <div className="flex flex-col gap-1.5">
                    <p className={`font-chakra text-xs leading-4 text-[#949398] ${collapsed ? "sr-only" : ""}`}>
                        Main Menu
                    </p>
                    {navItemsFor(user).map((item) => (
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

            <div className={`flex shrink-0 flex-col gap-3 ${collapsed ? "items-center" : ""}`}>
                <div className={`flex w-full items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
                    <div className="grid size-[52px] shrink-0 place-items-center rounded-full bg-[#23222f] p-0.5">
                        <span className="grid size-12 place-items-center rounded-full bg-[#e2e4e9] font-chakra text-base font-bold text-[#0A0D12]">
                            {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
                        </span>
                    </div>
                    <div className={`min-w-0 flex-1 font-chakra ${collapsed ? "sr-only" : ""}`}>
                        <p className="truncate text-base font-bold leading-6 text-white">{user.name || "Member"}</p>
                        <p className="truncate text-sm font-bold leading-5 text-[#949398]">{user.uuidBitunix || user.role}</p>
                    </div>
                    {!collapsed && logoutSlot}
                </div>
                {collapsed && logoutSlot}
            </div>
        </aside>
    );
}

function DashboardHeader({ collapsed, onToggle, pathname }) {
    const crumbs = breadcrumbFor(pathname);

    return (
        <header className="flex h-16 items-center gap-2 border-b border-[#414651] bg-[#07060e] px-4 sm:px-8">
            <button
                type="button"
                onClick={onToggle}
                className="hidden size-8 shrink-0 place-items-center rounded text-[#d5d7da] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8fb5c] lg:grid"
                aria-label={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
                aria-controls="dashboard-sidebar"
                aria-expanded={!collapsed}
            >
                <SidebarSimple size={18} aria-hidden />
            </button>
            <span className="hidden h-6 w-px bg-[#e8e8e8]/80 lg:block" aria-hidden />
            <nav aria-label="Breadcrumb" className="min-w-0">
                <ol className="flex min-w-0 items-center gap-1 px-1 font-chakra text-sm font-medium leading-5 text-[#fafafa]">
                    <li className="shrink-0">
                        <House size={18} className="text-[#fafafa]" aria-hidden />
                    </li>
                    {crumbs.map((crumb, index) => {
                        const last = index === crumbs.length - 1;
                        return (
                            <li key={crumb.label} className="flex min-w-0 items-center gap-1">
                                {index > 0 && <span className="text-[#717680]" aria-hidden>/</span>}
                                {crumb.href && !last ? (
                                    <Link href={crumb.href} className="truncate text-[#a4a7ae] hover:text-white">{crumb.label}</Link>
                                ) : (
                                    <span className="truncate" aria-current={last ? "page" : undefined}>{crumb.label}</span>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </header>
    );
}

function MobileNav({ logoutSlot, pathname, user }) {
    const items = navItemsFor(user);
    return (
        <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0A0D12]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
            <div className={`mx-auto grid max-w-md gap-1 ${items.length > NAV_ITEMS.length ? "grid-cols-6" : "grid-cols-5"}`}>
                {items.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    const ItemIcon = item.Icon;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold leading-none transition ${active
                                ? "border border-white/10 bg-gradient-to-r from-white/40 to-transparent text-white"
                                : "text-[#9A9A9A] hover:bg-white/[0.03] hover:text-white"
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
                            <span className="max-w-full truncate">{item.short || item.label.split(" ")[0]}</span>
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
            data-tactile
            className="min-h-dvh bg-[#050505] text-white"
            style={{
                "--sidebar-width": `${sidebarWidth}px`,
            }}
        >
            <a
                href="#dashboard-content"
                className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-lg bg-[#B7FB5B] px-4 py-2 font-chakra text-sm font-bold text-black focus:translate-y-0 motion-safe:transition-transform"
            >
                Lewati ke konten
            </a>
            <Sidebar
                collapsed={collapsed}
                user={resolvedUser}
                logoutSlot={resolvedLogoutSlot}
                pathname={pathname}
            />
            <div className="min-h-dvh bg-[#0b0d0f] pb-24 transition-[padding-left] duration-300 ease-out lg:pb-0 lg:pl-[var(--sidebar-width)]">
                <DashboardHeader
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((current) => !current)}
                    pathname={pathname}
                />
                <main id="dashboard-content" tabIndex={-1} className="focus:outline-none">
                    {children}
                </main>
            </div>
            <MobileNav logoutSlot={resolvedLogoutSlot} pathname={pathname} user={resolvedUser} />
        </div>
        </AuthGuard>
    );
}
