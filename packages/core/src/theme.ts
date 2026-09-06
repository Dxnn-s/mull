/**
 * Palette tokens shared by the extension overlay, popup, options page, and the web app.
 * Operator Amber default, Atelier Sage alternate, dark and light for each.
 * Applied via data-palette / data-theme on the root element of each surface.
 */
export const THEME_CSS = `
:host, :root, [data-mull-root] {
  --bg: #0a0a0e;
  --surface: rgba(255, 255, 255, 0.04);
  --surface-2: rgba(255, 255, 255, 0.07);
  --border: rgba(255, 255, 255, 0.10);
  --fg: #ececf1;
  --fg-muted: rgba(236, 236, 241, 0.62);
  --accent: #f59e0b;
  --accent-bright: #fbbf24;
  --accent-soft: rgba(245, 158, 11, 0.14);
  --accent-border: rgba(245, 158, 11, 0.35);
  --live: #22c55e;
  --data: #22d3ee;
  --danger: #ef4444;
  --serif: "Instrument Serif", "Iowan Old Style", Georgia, serif;
  --sans: "Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --radius: 14px;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  color-scheme: dark;
}
[data-palette="sage"] {
  --bg: #0a0e0b;
  --accent: #65a30d;
  --accent-bright: #84cc16;
  --accent-soft: rgba(132, 204, 22, 0.14);
  --accent-border: rgba(132, 204, 22, 0.35);
}
[data-theme="light"] {
  --bg: #f7f3e9;
  --surface: rgba(20, 16, 8, 0.04);
  --surface-2: rgba(20, 16, 8, 0.07);
  --border: rgba(20, 16, 8, 0.12);
  --fg: #1a1710;
  --fg-muted: rgba(26, 23, 16, 0.62);
  --accent: #b45309;
  --accent-bright: #d97706;
  --accent-soft: rgba(180, 83, 9, 0.12);
  --accent-border: rgba(180, 83, 9, 0.35);
  --shadow: 0 24px 80px rgba(40, 30, 10, 0.25);
  color-scheme: light;
}
[data-theme="light"][data-palette="sage"] {
  --bg: #f1f0e6;
  --accent: #3f6212;
  --accent-bright: #4d7c0f;
  --accent-soft: rgba(63, 98, 18, 0.12);
  --accent-border: rgba(63, 98, 18, 0.35);
}
`;
