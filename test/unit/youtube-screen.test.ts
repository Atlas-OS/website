import { describe, expect, it } from 'vitest';
import { screenStateFor } from '../../src/utils/youtube-screen';

describe('youtube screen', () => {
  it("maps YouTube's player states onto what the projector does", () => {
    expect(screenStateFor(1)).toBe('playing');
    expect(screenStateFor(2)).toBe('paused');
    expect(screenStateFor(0)).toBe('ended');
    // Unstarted, buffering and cued all mean the film isn't running yet.
    for (const state of [-1, 3, 5]) expect(screenStateFor(state)).toBe('loading');
  });
});
