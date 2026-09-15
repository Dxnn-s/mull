// Stamp the build id into the exported service worker.
//   node test/stamp-sw.mjs <dist dir>
//
// Two jobs. It names the cache, so a new release cannot serve an old bundle out
// of an old cache. And it changes the bytes of sw.js on every export, which is
// the only thing that makes a browser notice there is a new worker at all. The
// version before this never changed, so installed users were stuck for good.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist-web');
const sw = join(dist, 'sw.js');

// Hash the bundles rather than the clock, so rebuilding identical code keeps the
// same id and people are not handed a pointless update.
const hash = createHash('sha256');
const walk = (dir) => {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (name === 'sw.js') continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(js|css|html)$/.test(name)) hash.update(name).update(readFileSync(p));
  }
};
walk(dist);
const build = hash.digest('hex').slice(0, 12);

const src = readFileSync(sw, 'utf8');
if (!src.includes('__MULL_BUILD__')) {
  throw new Error('sw.js has no __MULL_BUILD__ placeholder, so the cache would never be versioned');
}
writeFileSync(sw, src.replace('__MULL_BUILD__', build));
console.log(`sw.js stamped build ${build}`);
