import { ATLAS_GITHUB_LATEST_RELEASE_API_URL } from '@/constants';

/** The fields of GitHub's latest-release response that the site reads. */
export interface GitHubRelease {
  tag_name?: string;
  name?: string;
  assets?: Array<{ name?: string; browser_download_url?: string }>;
}

/**
 * The label for a release, such as "Atlas v0.6.0", from its name or else its tag.
 * A name that already starts with "Atlas" is used as it is. Returns null when the release has neither.
 */
export function releaseLabel(release: GitHubRelease): string | null {
  const version = release.name?.trim() || release.tag_name?.trim();
  if (!version) return null;
  return version.startsWith('Atlas') ? version : `Atlas v${version.replace(/^v/i, '')}`;
}

const BUILD_FETCH_TIMEOUT_MS = 10_000;

let buildLabel: Promise<string | null> | undefined;

/**
 * The latest release's label, fetched once per build (and once per dev server) so the page carries the
 * current version without a constant to update. Returns null when GitHub can't be reached, answers with
 * an error or rate-limits the build; the page then renders a label without a version number.
 */
export function latestReleaseLabel(): Promise<string | null> {
  buildLabel ??= fetchReleaseLabel();
  return buildLabel;
}

/** One request for the latest release's label, or null if it fails. */
export async function fetchReleaseLabel(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetcher(ATLAS_GITHUB_LATEST_RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'atlasos.net build' },
      signal: AbortSignal.timeout(BUILD_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return releaseLabel((await response.json()) as GitHubRelease);
  } catch {
    return null;
  }
}
