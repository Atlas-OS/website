import type { AstroIntegration } from 'astro';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  file: string;
}

interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface ContentEntry {
  id: string;
  data: {
    title: string;
    description?: string;
    metaDescription?: string;
    image?: string;
  };
}

/**
 * Recursively reads all MDX/MD files from a directory
 */
async function readContentFiles(dir: string, baseDir: string): Promise<ContentEntry[]> {
  const entries: ContentEntry[] = [];
  const items = await readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      const subEntries = await readContentFiles(fullPath, baseDir);
      entries.push(...subEntries);
    } else if (item.isFile() && (item.name.endsWith('.mdx') || item.name.endsWith('.md'))) {
      try {
        const content = await readFile(fullPath, 'utf-8');
        const { data } = matter(content);
        const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
        entries.push({
          id: relativePath,
          data: {
            title: data.title || '',
            description: data.description,
            metaDescription: data.metaDescription,
            image: data.image,
          },
        });
      } catch (error) {
        console.warn(`Failed to parse ${fullPath}: ${error}`);
      }
    }
  }

  return entries;
}

/**
 * Validates SEO requirements for content collection entries
 */
async function validateSEO(): Promise<ValidationResult> {
  const issues: ValidationResult = {
    errors: [],
    warnings: [],
  };

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const projectRoot = join(currentFile, '../../..');
    const contentDir = join(projectRoot, 'src/content/docs');

    const docs = await readContentFiles(contentDir, contentDir);

    for (const entry of docs) {
      const filePath = entry.id;
      const { description, metaDescription, image } = entry.data;

      if (!metaDescription) {
        issues.errors.push({
          type: 'error',
          message: 'Meta description is required for SEO.',
          file: filePath,
        });
      } else {
        const metaDescLength = metaDescription.length;
        if (metaDescLength < 120) {
          issues.errors.push({
            type: 'error',
            message: `Meta description is too short (${metaDescLength} chars). Recommended: 150-160 chars.`,
            file: filePath,
          });
        } else if (metaDescLength > 170) {
          issues.errors.push({
            type: 'error',
            message: `Meta description is too long (${metaDescLength} chars). Recommended: 150-160 chars.`,
            file: filePath,
          });
        } else if (metaDescLength < 145 || metaDescLength > 165) {
          issues.warnings.push({
            type: 'warning',
            message: `Meta description length (${metaDescLength} chars) is outside ideal range (145-165 chars).`,
            file: filePath,
          });
        }
      }

      if (description) {
        const descLength = description.length;
        if (descLength > 100) {
          issues.errors.push({
            type: 'error',
            message: `OG image description is too long (${descLength} chars). Maximum: 100 chars, recommended: 60-80 chars.`,
            file: filePath,
          });
        } else if (descLength > 80) {
          issues.warnings.push({
            type: 'warning',
            message: `OG image description length (${descLength} chars) is above recommended range (60-80 chars).`,
            file: filePath,
          });
        }
      }

      if (image) {
        try {
          new URL(image);
        } catch {
          issues.errors.push({
            type: 'error',
            message: `Invalid image URL format: ${image}`,
            file: filePath,
          });
        }
      }
    }

    return issues;
  } catch (error) {
    issues.errors.push({
      type: 'error',
      message: `Failed to validate SEO: ${error instanceof Error ? error.message : String(error)}`,
      file: 'unknown',
    });
    return issues;
  }
}

/**
 * Formats and outputs validation results
 */
function formatValidationResults(result: ValidationResult): string {
  const output: string[] = [];
  const { errors, warnings } = result;

  if (errors.length === 0 && warnings.length === 0) {
    return '✅ All SEO validations passed!';
  }

  if (errors.length > 0) {
    output.push(`\n❌ SEO Validation Errors (${errors.length}):`);
    output.push('─'.repeat(60));
    for (const error of errors) {
      output.push(`\n  [ERROR] ${error.file}`);
      output.push(`          ${error.message}`);
    }
  }

  if (warnings.length > 0) {
    output.push(`\n⚠️  SEO Validation Warnings (${warnings.length}):`);
    output.push('─'.repeat(60));
    for (const warning of warnings) {
      output.push(`\n  [WARN]  ${warning.file}`);
      output.push(`          ${warning.message}`);
    }
  }

  return output.join('\n');
}

/**
 * Astro integration that validates SEO requirements for content collections
 * during the build process.
 */
export default function seoValidation(): AstroIntegration {
  return {
    name: 'seo-validation',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        logger.info('Validating SEO requirements for content collections...');

        try {
          const result = await validateSEO();
          const output = formatValidationResults(result);

          if (result.errors.length > 0 || result.warnings.length > 0) {
            logger.warn(output);

            if (result.errors.length > 0) {
              logger.error(
                `\nFound ${result.errors.length} SEO error(s). Please fix these issues.`,
              );
            }
          } else {
            logger.info(output);
          }
        } catch (error) {
          logger.error(
            `Failed to run SEO validation: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    },
  };
}
