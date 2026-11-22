import { describe, expect, it } from 'vitest';
import {
  buildRedirectRules,
  MAX_STATIC_REDIRECTS,
} from '../../src/integrations/cloudflare-redirects';

describe('buildRedirectRules', () => {
  it('emits a permanent rule for both trailing-slash forms of a directory path', () => {
    expect(buildRedirectRules({ '/general-faq/': '/docs/faq/general/' })).toEqual([
      '/general-faq/ /docs/faq/general/ 301',
      '/general-faq /docs/faq/general/ 301',
    ]);
  });

  it('keeps file paths, fragments and explicit status codes as written', () => {
    expect(
      buildRedirectRules({
        '/defaultimg.png': '/og-image.png',
        '/install-faq/removed-features/': {
          status: 302,
          destination: '/docs/faq/installation/#what-was-removed-from-windows',
        },
      }),
    ).toEqual([
      '/defaultimg.png /og-image.png 301',
      '/install-faq/removed-features/ /docs/faq/installation/#what-was-removed-from-windows 302',
      '/install-faq/removed-features /docs/faq/installation/#what-was-removed-from-windows 302',
    ]);
  });

  it('does not duplicate the root path', () => {
    expect(buildRedirectRules({ '/': '/docs/' })).toEqual(['/ /docs/ 301']);
  });

  it('rejects dynamic sources, which _redirects cannot express', () => {
    expect(() => buildRedirectRules({ '/blog/[slug]': '/posts/[slug]' })).toThrow(/Dynamic/);
  });

  it("enforces Cloudflare's static redirect limit", () => {
    const many = Object.fromEntries(
      Array.from({ length: MAX_STATIC_REDIRECTS / 2 + 1 }, (_, i) => [`/old-${i}/`, '/']),
    );
    expect(() => buildRedirectRules(many)).toThrow(/limit/);
  });
});
