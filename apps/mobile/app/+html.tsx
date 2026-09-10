import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * The HTML shell for the web build. Expo Router renders every page inside this.
 *
 * Carries the Add to Home Screen contract: manifest, apple-touch-icon (Apple
 * ignores manifest icons), standalone display, and viewport-fit=cover so the
 * layout runs under the notch once installed. The paper colour is set on html
 * and body as well as theme-color, so the status bar and the overscroll area
 * match the app instead of flashing white.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />

        <title>Mull</title>
        <meta name="description" content="Think first. Pass a card to unlock." />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f8f4e8" />
        <meta name="color-scheme" content="light" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mull" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/icon-192.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const SHELL_CSS = `
html, body { background-color: #f8f4e8; }
body { overscroll-behavior-y: none; -webkit-tap-highlight-color: transparent; }
@media (prefers-color-scheme: dark) { html, body { background-color: #f8f4e8; } }
`;
