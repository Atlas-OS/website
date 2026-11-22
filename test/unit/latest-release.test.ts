import { describe, expect, it } from 'vitest';
import { ATLAS_GITHUB_LATEST_RELEASE_API_URL } from '../../src/constants';
import { fetchReleaseLabel, releaseLabel } from '../../src/utils/latest-release';

describe('releaseLabel', () => {
  it('prefers the name and drops a leading v', () => {
    expect(releaseLabel({ name: 'v0.6.0', tag_name: 'v0.5.0' })).toBe('Atlas v0.6.0');
    expect(releaseLabel({ name: '0.5.0-hotfix' })).toBe('Atlas v0.5.0-hotfix');
  });

  it('falls back to the tag when the name is empty', () => {
    expect(releaseLabel({ name: ' ', tag_name: 'v0.6.1' })).toBe('Atlas v0.6.1');
  });

  it('keeps a name that already says Atlas', () => {
    expect(releaseLabel({ name: 'Atlas v0.6.0' })).toBe('Atlas v0.6.0');
  });

  it('returns null without a name or tag', () => {
    expect(releaseLabel({})).toBeNull();
  });
});

describe('fetchReleaseLabel', () => {
  const answer =
    (body: string, status = 200): typeof fetch =>
    () =>
      Promise.resolve(new Response(body, { status }));

  it('reads the latest release from GitHub', async () => {
    let requested: unknown;
    const fetcher: typeof fetch = input => {
      requested = input;
      return Promise.resolve(new Response(JSON.stringify({ tag_name: 'v0.6.0' })));
    };
    await expect(fetchReleaseLabel(fetcher)).resolves.toBe('Atlas v0.6.0');
    expect(requested).toBe(ATLAS_GITHUB_LATEST_RELEASE_API_URL);
  });

  it('returns null when GitHub answers with an error', async () => {
    const limited = answer(JSON.stringify({ message: 'API rate limit exceeded' }), 403);
    await expect(fetchReleaseLabel(limited)).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    const offline: typeof fetch = () => Promise.reject(new TypeError('fetch failed'));
    await expect(fetchReleaseLabel(offline)).resolves.toBeNull();
  });

  it('returns null when the response is not JSON', async () => {
    await expect(fetchReleaseLabel(answer('<html></html>'))).resolves.toBeNull();
  });
});
