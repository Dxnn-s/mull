/**
 * A published iCloud Shortcut link, so setting the block is a tap rather than
 * a copied address. Authoring one needs an iPhone: build the Shortcut in the
 * Shortcuts app, Share, Copy iCloud Link, paste it here.
 *
 * Apple only shares Shortcuts this way, never Automations, so the trigger
 * ("when ChatGPT opens") still has to be made by hand. What the link removes is
 * every bit of typing, which is the part people actually get wrong.
 *
 * Empty until one is published; the setup screen falls back to the manual
 * recipe rather than showing a dead button.
 */
export const SHORTCUT_URL = '';

/** Where the Shortcut should send people. Also the manual fallback address. */
export function mullUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://mull.school';
}
