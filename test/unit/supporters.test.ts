import { describe, expect, it } from 'vitest';
import {
  cleanSupporterText,
  parseSupporterWall,
  SUPPORTER_LIMIT,
  supporterWallJson,
} from '../../src/utils/supporters';

const char = (codePoint: number) => String.fromCodePoint(codePoint);

describe('cleanSupporterText', () => {
  it('trims, collapses spaces and removes control and formatting characters', () => {
    expect(cleanSupporterText('  Jo   Example ')).toBe('Jo Example');
    expect(cleanSupporterText('Jo\n\tExample')).toBe('Jo Example');
    expect(cleanSupporterText(`Jo${char(0x07)}Ex${char(0x202e)}am${char(0x200b)}ple`)).toBe(
      'JoExample',
    );
  });

  it('keeps emoji joined and caps names at 40 characters', () => {
    const family = `${char(0x1f469)}${char(0x200d)}${char(0x1f467)}`;
    expect(cleanSupporterText(`Jo ${family}`)).toBe(`Jo ${family}`);
    expect(cleanSupporterText('A'.repeat(60))).toBe('A'.repeat(40));
  });

  it('shortens stacks of combining marks', () => {
    expect(cleanSupporterText(`Jo${char(0x336).repeat(10)}`)).toBe(`Jo${char(0x336).repeat(3)}`);
  });

  it('returns null for empty or non-string values', () => {
    expect(cleanSupporterText('   ')).toBeNull();
    expect(cleanSupporterText(char(0x202e))).toBeNull();
    expect(cleanSupporterText(42)).toBeNull();
    expect(cleanSupporterText(null)).toBeNull();
  });
});

describe('parseSupporterWall', () => {
  it('keeps names and tiers and normalises the update time', () => {
    expect(
      parseSupporterWall({
        updatedAt: '2026-11-26T12:00:00Z',
        monthly: [{ name: 'Sam Sample', tier: 'Gigabyte' }, { name: 'Jo Example' }],
        oneOff: [{ name: 'Alex Placeholder', amount: 5 }],
      }),
    ).toEqual({
      updatedAt: '2026-11-26T12:00:00.000Z',
      monthly: [
        { name: 'Sam Sample', tier: 'Gigabyte' },
        { name: 'Jo Example', tier: null },
      ],
      oneOff: [{ name: 'Alex Placeholder' }],
    });
  });

  it('rejects values that are not shaped like a wall', () => {
    for (const value of [null, [], 'text', { monthly: [] }, { monthly: {}, oneOff: [] }]) {
      expect(parseSupporterWall(value)).toBeNull();
    }
  });

  it('drops entries without a usable name', () => {
    const wall = parseSupporterWall({
      updatedAt: 'not a date',
      monthly: [null, 'Jo', { name: 5 }, { name: ' ' }, { name: 'Jo Example', tier: 7 }],
      oneOff: [{}, { name: ['Sam'] }],
    });
    expect(wall).toEqual({
      updatedAt: null,
      monthly: [{ name: 'Jo Example', tier: null }],
      oneOff: [],
    });
  });

  it('holds at most 200 names, monthly members first', () => {
    const names = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, index) => ({ name: `${prefix} ${index}` }));
    const wall = parseSupporterWall({ monthly: names('Member', 150), oneOff: names('Donor', 150) });
    expect(wall?.monthly).toHaveLength(150);
    expect(wall?.oneOff).toHaveLength(SUPPORTER_LIMIT - 150);
  });
});

describe('supporterWallJson', () => {
  it('escapes characters that mean something in HTML', () => {
    const json = supporterWallJson({
      updatedAt: null,
      monthly: [],
      oneOff: [{ name: '<script>&</script>' }],
    });
    expect(json).not.toMatch(/[<>&]/);
    expect(JSON.parse(json)).toEqual({
      updatedAt: null,
      monthly: [],
      oneOff: [{ name: '<script>&</script>' }],
    });
  });
});
