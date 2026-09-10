// Builds screenshots/index.html: every shot, grouped by palette and mode, images
// inlined so the file opens straight off disk with no server.
//   node test/gallery.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, '../screenshots');

const SCREEN_ORDER = ['home', 'unlock-explain', 'unlock-quiz', 'sessions', 'stats', 'subjects', 'blocked-apps', 'you', 'paywall'];
const SCREEN_TITLE = {
  home: 'Today',
  'unlock-explain': 'Unlock · the lesson',
  'unlock-quiz': 'Unlock · the quiz',
  sessions: 'Sessions',
  stats: 'Record',
  subjects: 'Subjects',
  'blocked-apps': 'Blocked apps',
  you: 'You',
  paywall: 'Plans',
};
const SET_TITLE = {
  'amber-light': 'Operator Amber · paper',
  'sage-light': 'Atelier Sage · paper',
  'amber-dark': 'Operator Amber · ink',
  'sage-dark': 'Atelier Sage · ink',
};

const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
const shots = files.map((f) => {
  const m = /^(amber|sage)-(light|dark)-(.+)\.png$/.exec(f);
  return m ? { file: f, set: `${m[1]}-${m[2]}`, screen: m[3] } : null;
}).filter(Boolean);

const sets = [...new Set(shots.map((s) => s.set))].sort((a, b) => {
  const order = Object.keys(SET_TITLE);
  return order.indexOf(a) - order.indexOf(b);
});

const b64 = (f) => `data:image/png;base64,${readFileSync(resolve(dir, f)).toString('base64')}`;

const section = (set) => {
  const inSet = shots
    .filter((s) => s.set === set)
    .sort((a, b) => {
      const ia = SCREEN_ORDER.indexOf(a.screen);
      const ib = SCREEN_ORDER.indexOf(b.screen);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  return `<section>
  <h2><span class="rule"></span>${SET_TITLE[set] ?? set}</h2>
  <div class="grid">
    ${inSet.map((s) => `<figure><img loading="lazy" src="${b64(s.file)}" alt="${s.screen}"><figcaption>${SCREEN_TITLE[s.screen] ?? s.screen}</figcaption></figure>`).join('\n    ')}
  </div>
</section>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mull · screens</title>
<style>
  :root { --bg:#f8f4e8; --fg:#1a1710; --muted:rgba(26,23,16,.58); --faint:rgba(26,23,16,.20); --rule:rgba(26,23,16,.13); --accent:#b45309; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font-family:"Space Grotesk",-apple-system,system-ui,sans-serif; padding:48px 28px 96px; }
  header { max-width:1180px; margin:0 auto 56px; }
  .eyebrow { font-family:ui-monospace,"Geist Mono",Menlo,monospace; font-size:11px; letter-spacing:1.3px; text-transform:uppercase; color:var(--accent); }
  h1 { font-family:"Instrument Serif",Georgia,serif; font-weight:400; font-size:52px; line-height:1.05; margin:12px 0 10px; letter-spacing:-.01em; }
  header p { color:var(--muted); max-width:62ch; margin:0; font-size:15px; line-height:1.6; }
  main { max-width:1180px; margin:0 auto; }
  section { margin:0 0 64px; }
  h2 { font-family:ui-monospace,"Geist Mono",Menlo,monospace; font-size:11px; letter-spacing:1.3px; text-transform:uppercase; color:var(--muted); font-weight:500; display:flex; align-items:center; gap:14px; margin:0 0 24px; }
  h2 .rule { display:none; }
  h2::after { content:""; flex:1; height:1px; background:var(--rule); }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(232px,1fr)); gap:32px 24px; }
  figure { margin:0; }
  img { width:100%; display:block; border:1px solid var(--rule); border-radius:4px; background:var(--bg); }
  figcaption { font-family:ui-monospace,"Geist Mono",Menlo,monospace; font-size:10.5px; letter-spacing:1.2px; text-transform:uppercase; color:var(--muted); margin-top:10px; }
  footer { max-width:1180px; margin:72px auto 0; padding-top:20px; border-top:1px solid var(--rule); font-family:ui-monospace,"Geist Mono",Menlo,monospace; font-size:10.5px; letter-spacing:1.2px; text-transform:uppercase; color:var(--faint); }
  @media (max-width:640px){ body{padding:32px 18px 64px;} h1{font-size:38px;} }
</style>
</head>
<body>
<header>
  <div class="eyebrow">mull · screens</div>
  <h1>Paper and ink.</h1>
  <p>Every screen of the iPhone app, rendered at 390&times;844 from the real build. Light is the default. The dial replaced the orb, the accent appears about three times a page, and the corners are print corners. Demo data: a session running, four days of a week logged, three apps shielded.</p>
</header>
<main>
${sets.map(section).join('\n')}
</main>
<footer>${shots.length} shots · generated from apps/mobile · regenerate with pnpm --filter @mull/mobile shots</footer>
</body>
</html>`;

writeFileSync(resolve(dir, 'index.html'), html);
console.log(`screenshots/index.html (${shots.length} shots, ${(html.length / 1e6).toFixed(1)} MB)`);
