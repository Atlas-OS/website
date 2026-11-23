import type { APIRoute } from 'astro';
import { ATLAS_MANAGER_DOWNLOAD_URL, SITE_URL } from '@/constants';

export const GET: APIRoute = () =>
  new Response(
    [
      '# AtlasOS',
      '',
      'AtlasOS is a free, open-source Windows 11 modification that reduces background activity, telemetry and ads while keeping apps and games compatible.',
      '',
      '## Install AtlasOS',
      '',
      `1. [Check Windows and hardware requirements](${SITE_URL}/docs/install/requirements.md).`,
      '2. Back up your files before reinstalling Windows.',
      `3. [Download Atlas Manager](${ATLAS_MANAGER_DOWNLOAD_URL}) and follow the [installation guide](${SITE_URL}/docs/install/manager.md).`,
      '',
      '## Guides and tools',
      '',
      `- [Upgrade an existing installation](${SITE_URL}/docs/upgrade.md)`,
      `- [Configure AtlasOS](${SITE_URL}/docs/atlas-configuration.md)`,
      `- [Troubleshoot AtlasOS](${SITE_URL}/docs/faq.md)`,
      `- [Browse all guides in Markdown](${SITE_URL}/llms.txt)`,
      `- [Use the AtlasOS CLI](${SITE_URL}/docs/contributing/cli.md)`,
      `- [Read the public statistics API schema](${SITE_URL}/openapi.json)`,
      '',
      '## Project',
      '',
      '- [Source code and releases](https://github.com/Atlas-OS/Atlas)',
      `- [About AtlasOS](${SITE_URL}/about/)`,
      `- [Contact](${SITE_URL}/contact/)`,
      `- [Privacy policy](${SITE_URL}/privacy-policy/)`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
  );
