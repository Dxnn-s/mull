import { detectSite } from './sites.ts';
import { installIntercept } from './intercept.ts';

const site = detectSite();
if (site) {
  installIntercept(site);
} else {
  console.debug('[mull] no site adapter for', location.hostname);
}
