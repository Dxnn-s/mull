import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Space_Grotesk, Geist_Mono } from 'next/font/google';
import { THEME_CSS } from '@mull/core/theme';
import './globals.css';
import { Nav } from '@/components/Nav';

const serif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const sans = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Mull',
  description: 'Opal for AI. Think first, then get the answer.',
};

export const viewport: Viewport = { themeColor: '#0a0a0e' };

// Runs before paint: pick up the saved palette/theme so there is no flash.
const bootScript = `try{var s=JSON.parse(localStorage.getItem('mull.settings')||'{}');var r=document.documentElement;r.dataset.palette=s.palette||'amber';r.dataset.theme=s.theme||'dark';}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mull-root data-palette="amber" data-theme="dark" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--serif:var(--font-serif),"Iowan Old Style",Georgia,serif;--sans:var(--font-sans),system-ui,sans-serif;--mono:var(--font-mono),ui-monospace,Menlo,monospace;}`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
