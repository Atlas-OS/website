/**
 * The supporter wall: public Ko-fi supporters, served by the Discord bot and passed through
 * `/api/supporters` (src/worker.ts). The Worker checks and cleans what the bot sends with
 * `parseSupporterWall`, and the docs page checks it again before showing it.
 */

export interface MonthlySupporter {
  name: string;
  tier: string | null;
}

export interface OneOffSupporter {
  name: string;
}

export interface SupporterWall {
  updatedAt: string | null;
  monthly: MonthlySupporter[];
  oneOff: OneOffSupporter[];
}

export const SUPPORTER_LIMIT = 200;
const MAX_TEXT_LENGTH = 40;

/** Joiners are formatting characters too, but emoji and some scripts need them. */
const JOINERS = new Set([String.fromCharCode(0x200c), String.fromCharCode(0x200d)]);
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

export function emptySupporterWall(): SupporterWall {
  return { updatedAt: null, monthly: [], oneOff: [] };
}

/**
 * A name or tier as plain visible text: control and formatting characters removed (bidirectional
 * overrides included), spaces collapsed, stacks of combining marks shortened and at most 40
 * characters. Null when nothing visible is left or the value isn't a string.
 */
export function cleanSupporterText(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const text = value
    .normalize('NFC')
    .replace(/\s+/gu, ' ')
    .replace(/[\p{Cc}\p{Cf}]/gu, character => (JOINERS.has(character) ? character : ''))
    .replace(/(\p{M}{3})\p{M}+/gu, '$1')
    .trim();

  let capped = '';
  let count = 0;
  for (const { segment } of graphemes.segment(text)) {
    if (++count > MAX_TEXT_LENGTH) break;
    capped += segment;
  }
  return capped.trim() || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The wall from untrusted JSON, or null when it isn't shaped like one. Entries without a usable
 * name are dropped, and the wall holds at most 200 names, monthly members first.
 */
export function parseSupporterWall(value: unknown): SupporterWall | null {
  if (!isRecord(value) || !Array.isArray(value.monthly) || !Array.isArray(value.oneOff)) {
    return null;
  }

  const monthly = value.monthly
    .flatMap((entry: unknown) => {
      if (!isRecord(entry)) return [];
      const name = cleanSupporterText(entry.name);
      return name ? [{ name, tier: cleanSupporterText(entry.tier) }] : [];
    })
    .slice(0, SUPPORTER_LIMIT);

  const oneOff = value.oneOff
    .flatMap((entry: unknown) => {
      const name = isRecord(entry) ? cleanSupporterText(entry.name) : null;
      return name ? [{ name }] : [];
    })
    .slice(0, SUPPORTER_LIMIT - monthly.length);

  const updated = typeof value.updatedAt === 'string' ? Date.parse(value.updatedAt) : Number.NaN;
  return {
    updatedAt: Number.isFinite(updated) ? new Date(updated).toISOString() : null,
    monthly,
    oneOff,
  };
}

/** JSON with `<`, `>` and `&` written as Unicode escapes, so it stays inert even inside HTML. */
export function supporterWallJson(wall: SupporterWall): string {
  return JSON.stringify(wall).replace(
    /[<>&]/g,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
