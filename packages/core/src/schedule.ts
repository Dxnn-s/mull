import type { Settings } from './types.ts';

export interface HardSchedule {
  /** 0 = Sunday ... 6 = Saturday. */
  days: number[];
  /** "HH:MM" 24h, local time. */
  start: string;
  /** "HH:MM" 24h, local time. End before start means the window crosses midnight. */
  end: string;
}

export const EXAM_WEEK: HardSchedule = { days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' };
export const SCHOOL_NIGHTS: HardSchedule = { days: [1, 2, 3, 4], start: '19:00', end: '23:00' };

function minutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return Number.NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * The one place hard mode is decided. `hardMode.enabled` is the master switch;
 * a schedule narrows it to a window. No schedule = enabled means always.
 */
export function isHardModeNow(settings: Pick<Settings, 'hardMode'>, now: Date = new Date()): boolean {
  const hm = settings.hardMode;
  if (!hm.enabled) return false;
  const sched = hm.schedule;
  if (!sched) return true;
  const day = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = minutes(sched.start);
  const end = minutes(sched.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true;
  if (start <= end) {
    return sched.days.includes(day) && nowMin >= start && nowMin <= end;
  }
  // Crosses midnight: tonight after start on a listed day, or before end on the morning after one.
  const yesterday = (day + 6) % 7;
  return (sched.days.includes(day) && nowMin >= start) || (sched.days.includes(yesterday) && nowMin <= end);
}

/** "until 11:00 pm" style label for the popup, or null when hard mode is not on right now. */
export function hardModeUntil(settings: Pick<Settings, 'hardMode'>, now: Date = new Date()): string | null {
  if (!isHardModeNow(settings, now)) return null;
  const sched = settings.hardMode.schedule;
  if (!sched) return 'always';
  const end = minutes(sched.end);
  const h = Math.floor(end / 60);
  const m = end % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `until ${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
