// esbuild bundle for the MV3 extension.
//   node build.mjs           -> dist/
//   node build.mjs --test    -> dist-test/ (content script also matches 127.0.0.1 fixtures)
//   node build.mjs --watch
import { build, context } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const isTest = process.argv.includes('--test');
const isWatch = process.argv.includes('--watch');
const outdir = resolve(here, isTest ? 'dist-test' : 'dist');

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const manifest = JSON.parse(readFileSync(resolve(here, 'manifest.json'), 'utf8'));
if (isTest) {
  manifest.content_scripts[0].matches.push('http://127.0.0.1/*', 'http://localhost/*');
  manifest.name = 'Mull (test)';
}
writeFileSync(resolve(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
for (const f of ['popup.html', 'options.html']) cpSync(resolve(here, 'src/pages', f), resolve(outdir, f));

const options = {
  entryPoints: {
    background: resolve(here, 'src/background.ts'),
    content: resolve(here, 'src/content/index.ts'),
    popup: resolve(here, 'src/pages/popup.ts'),
    options: resolve(here, 'src/pages/options.ts'),
  },
  bundle: true,
  outdir,
  format: 'esm',
  target: 'chrome120',
  platform: 'browser',
  sourcemap: isTest ? 'inline' : false,
  minify: !isTest && !isWatch,
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': JSON.stringify(isTest ? 'test' : 'production') },
};

if (isWatch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('watching...');
} else {
  await build(options);
}
