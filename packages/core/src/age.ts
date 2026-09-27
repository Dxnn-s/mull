import type { ProviderId } from './types.ts';
import { PROVIDER_INFO } from './provider-info.ts';

/**
 * Who is allowed to link what.
 *
 * Mull is aimed at high-school students, so a good share of the people opening
 * it are under eighteen and some are under thirteen. Every provider it can talk
 * to has a minimum age in its own terms, and the app was offering all of them to
 * everyone with the age printed underneath as grey subtitle text next to a
 * working Save button. That is not a gate, it is a disclaimer.
 *
 * The bands are coarse on purpose. Mull does not want a birthday, it wants the
 * least information that answers the only question it has to ask. Nothing about
 * this is verified, because nothing here can be verified on a device and
 * pretending otherwise would be worse than being plain about it.
 */
export type AgeBand = 'under13' | 'teen' | 'adult';

/** What each band is told the band means, in their words not ours. */
export const AGE_BANDS: Array<{ band: AgeBand; label: string; note: string }> = [
  { band: 'under13', label: 'Under 13', note: 'Mull works fully offline for you. Nothing to link, nothing to set up.' },
  { band: 'teen', label: '13 to 17', note: 'You can link OpenAI with a parent’s permission. The others say 18 and up in their own terms.' },
  { band: 'adult', label: '18 or older', note: 'Any provider.' },
];

const MIN_AGE: Record<ProviderId, number> = {
  // Its own terms of service require eighteen, and it is the one-tap default,
  // so it is the most important one to gate rather than the easiest.
  openrouter: 18,
  // The only provider whose terms allow a thirteen year old, with a parent.
  openai: 13,
  gemini: 18,
  anthropic: 18,
  // The shipped card bank. No account, no network, no age requirement.
  mock: 0,
};

/** Lowest age each band could be, for comparing against a provider minimum. */
const FLOOR: Record<AgeBand, number> = { under13: 0, teen: 13, adult: 18 };

/** Whether someone in this band may link this provider, by that provider's own terms. */
export function canUse(band: AgeBand, provider: ProviderId): boolean {
  return FLOOR[band] >= MIN_AGE[provider];
}

/** The providers to actually show. Hiding beats showing something unusable. */
export function providersFor(band: AgeBand): ProviderId[] {
  return (Object.keys(PROVIDER_INFO) as ProviderId[]).filter((p) => p !== 'mock' && canUse(band, p));
}

/** Why a provider is missing, for saying so rather than leaving a gap. */
export function whyHidden(band: AgeBand): string | null {
  if (band === 'adult') return null;
  if (band === 'under13') return 'Linking an AI account needs you to be at least 13, so Mull runs on its own cards for you. They cover every subject and they work with no signal.';
  return 'OpenAI is the only provider whose terms allow under 18s, so it is the only one here. Ask a parent before you link it.';
}

/** The minimum age a provider's own terms state. Exposed so the UI can say it. */
export function minAgeFor(provider: ProviderId): number {
  return MIN_AGE[provider];
}
