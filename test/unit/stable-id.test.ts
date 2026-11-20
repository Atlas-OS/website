import { describe, expect, it } from 'vitest';
import { stableId } from '../../src/utils/stable-id';

describe('stableId', () => {
  it('is deterministic for the same inputs', () => {
    expect(stableId('term', 'Affinities', 'definition')).toBe(
      stableId('term', 'Affinities', 'definition'),
    );
  });

  it('uses the prefix and differs when the seeds differ', () => {
    const id = stableId('term', 'Affinities');
    expect(id).toMatch(/^term-[0-9a-z]+$/);
    expect(id).not.toBe(stableId('term', 'Interrupts'));
  });

  it('produces values that are safe as CSS dashed idents', () => {
    expect(`--${stableId('term', 'Ünïcode — text')}`).toMatch(/^--term-[0-9a-z]+$/);
  });
});
