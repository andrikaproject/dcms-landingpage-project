'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';

type LandingUser = {
  name: string | null;
  email: string | null;
  role: string | null;
  uuidBitunix: string | null;
};

const NAV_LINKS = [
  { label: 'Community', href: '#community-section' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Stories', href: '#stories' },
  { label: 'FAQ', href: '#faq' },
];

function LimeButton({ href, children, size = 'md' }: { href: string; children: React.ReactNode; size?: 'sm' | 'md' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      style={{
        height: size === 'sm' ? 34 : 40,
        borderRadius: 999,
        background: hovered ? '#a8ec4c' : '#b7fb5b',
        color: '#111315',
        display: 'flex',
        alignItems: 'center',
        padding: size === 'sm' ? '0 14px' : '0 18px',
        fontWeight: 700,
        fontSize: size === 'sm' ? 12 : 13,
        fontFamily: 'Chakra Petch, Arial, sans-serif',
        textDecoration: 'none',
        boxShadow: hovered ? '0 0 36px rgba(183,251,91,.45)' : '0 0 24px rgba(183,251,91,.25)',
        gap: 6,
        outline: 'none',
        transition: 'background 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  );
}

function LoginLink() {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href="/login"
      style={{
        color: hovered ? '#fff' : '#d7deea',
        fontSize: 13,
        fontWeight: 600,
        padding: '0 14px',
        fontFamily: 'Chakra Petch, Arial, sans-serif',
        textDecoration: 'none',
        outline: 'none',
        transition: 'color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Login
    </Link>
  );
}

function MobileMenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'block',
        padding: '10px 16px',
        borderRadius: 12,
        color: '#d7deea',
        fontSize: 14,
        fontFamily: 'Chakra Petch, Arial, sans-serif',
        textDecoration: 'none',
        outline: 'none',
        background: hovered ? 'rgba(255,255,255,.07)' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  );
}

function NavLink({ href, label, isFirst }: { href: string; label: string; isFirst: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      style={{
        color: hovered || isFirst ? '#fff' : '#aeb7c4',
        textDecoration: 'none',
        fontWeight: isFirst ? 600 : 400,
        fontSize: 13,
        fontFamily: 'Chakra Petch, Arial, sans-serif',
        padding: '6px 14px',
        borderRadius: 999,
        background: hovered ? 'rgba(255,255,255,.08)' : 'transparent',
        transition: 'color 0.15s, background 0.15s',
        outline: 'none',
        display: 'block',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </Link>
  );
}

/* Liquid glass island style */
const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,.08)',
  border: '1px solid rgba(255,255,255,.18)',
  backdropFilter: 'blur(40px) saturate(180%)',
  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  boxShadow:
    'inset 0 1.5px 0 rgba(255,255,255,.22),' +
    'inset 0 -1px 0 rgba(255,255,255,.04),' +
    '0 8px 32px rgba(0,0,0,.45),' +
    '0 0 0 1px rgba(255,255,255,.04)',
};

function UserPill({ user, logoutSlot }: { user: LandingUser; logoutSlot: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = user.name || user.email || 'Member';
  const detail = user.uuidBitunix ? `UID ${user.uuidBitunix}` : user.role || 'Member';

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 999,
          border: isOpen ? '1px solid rgba(183,251,91,.35)' : '1px solid rgba(255,255,255,.10)',
          background: isOpen ? 'rgba(255,255,255,.10)' : 'transparent',
          padding: '5px 12px 5px 5px',
          cursor: 'pointer',
          fontFamily: 'Chakra Petch, Arial, sans-serif',
          transition: 'background 0.15s, border-color 0.15s',
          color: '#fff',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: '#b7fb5b',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 900,
            color: '#111315',
            flexShrink: 0,
          }}
        >
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
            {displayName}
          </p>
          <p style={{ fontSize: 10, color: '#8f9aaa', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
            {detail}
          </p>
        </div>
        <svg
          style={{
            width: 12,
            height: 12,
            color: '#8f9aaa',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            zIndex: 200,
            width: 216,
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,.10)',
            background: 'rgba(10,11,14,.96)',
            padding: 8,
            boxShadow: '0 24px 80px rgba(0,0,0,.6)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
          }}
          role="menu"
        >
          <div style={{ borderBottom: '1px solid rgba(255,255,255,.08)', padding: '8px 12px 10px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </p>
            <p style={{ fontSize: 11, color: '#8f9aaa', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {detail}
            </p>
          </div>
          <div style={{ paddingTop: 8 }}>{logoutSlot}</div>
        </div>
      )}
    </div>
  );
}

export function HeroNavbar({
  user,
  logoutSlot,
}: {
  user: LandingUser | null;
  logoutSlot: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop: 3 centered liquid glass islands */}
      <div
        className="hidden md:flex"
        style={{ justifyContent: 'center', gap: 12, alignItems: 'center' }}
      >
        {/* Left island: Logo + DCMS */}
        <div
          className="dcms-glass-island"
          style={{
            ...glass,
            height: 56,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 18px',
          }}
        >
          <Image
            src="/images/logo-dcms.svg"
            alt="DCMS Logo"
            width={32}
            height={32}
            className="object-contain"
          />
          <b
            style={{
              fontFamily: 'Nebulica, Chakra Petch, Arial, sans-serif',
              fontSize: 13,
              color: '#fff',
              fontWeight: 700,
            }}
          >
            DCMS
          </b>
        </div>

        {/* Center island: nav links */}
        <div
          className="dcms-glass-island"
          style={{
            ...glass,
            height: 56,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '0 16px',
            isolation: 'isolate',
          }}
        >
          {NAV_LINKS.map((link, i) => (
            <NavLink key={link.label} href={link.href} label={link.label} isFirst={i === 0} />
          ))}
        </div>

        {/* Right island: auth */}
        <div
          className="dcms-glass-island"
          style={{
            ...glass,
            height: 56,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: user ? '0 8px' : '0 8px 0 16px',
          }}
        >
          {user ? (
            <>
              <UserPill user={user} logoutSlot={logoutSlot} />
              <LimeButton href="/dashboard">
                Dashboard
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </LimeButton>
            </>
          ) : (
            <>
              <LoginLink />
              <LimeButton href="/register">Daftar Member</LimeButton>
            </>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div
        className="flex md:hidden"
        style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
      >
        {/* Logo island */}
        <div
          style={{
            ...glass,
            height: 48,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 14px',
          }}
        >
          <Image src="/images/logo-dcms.svg" alt="DCMS Logo" width={26} height={26} className="object-contain" />
          <b style={{ fontFamily: 'Nebulica, Chakra Petch, Arial, sans-serif', fontSize: 12, color: '#fff' }}>DCMS</b>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user ? (
            <LimeButton href="/dashboard" size="sm">Dashboard</LimeButton>
          ) : (
            <LimeButton href="/register" size="sm">Daftar Member</LimeButton>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
            style={{
              ...glass,
              width: 42,
              height: 42,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden"
          style={{
            marginTop: 8,
            borderRadius: 20,
            ...glass,
            padding: 12,
          }}
        >
          {NAV_LINKS.map((link) => (
            <MobileMenuLink key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}>
              {link.label}
            </MobileMenuLink>
          ))}
          {!user && (
            <MobileMenuLink href="/login" onClick={() => setMobileMenuOpen(false)}>
              Login
            </MobileMenuLink>
          )}
          {user && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 6, paddingTop: 6 }}>
              {logoutSlot}
            </div>
          )}
        </div>
      )}
    </>
  );
}
