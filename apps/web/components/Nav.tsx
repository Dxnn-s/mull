'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'chat' },
  { href: '/stats', label: 'stats' },
  { href: '/settings', label: 'settings' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--mono)',
        fontSize: 12,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      <Link href="/" style={{ textDecoration: 'none', color: 'var(--accent)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 4px var(--accent-soft)' }} />
        mull
      </Link>
      <div style={{ display: 'flex', gap: 18 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{ textDecoration: 'none', color: path === l.href ? 'var(--fg)' : 'var(--fg-muted)' }}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
