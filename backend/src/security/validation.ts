/**
 * Input validation schemas using Zod.
 * All user input must be validated before processing.
 */

import { z } from 'zod';

/**
 * URL validation with security checks.
 */
export const urlSchema = z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL too long')
    .refine(
        (val) => {
            try {
                const url = new URL(val);
                return ['http:', 'https:'].includes(url.protocol);
            } catch {
                return false;
            }
        },
        { message: 'Must be a valid HTTP or HTTPS URL' }
    );

/**
 * Crawl scope options.
 */
export const scopeSchema = z.enum(['same-domain', 'same-host', 'subdomains', 'custom']).default('same-domain');

/**
 * File type filter options.
 * NOTE: 'other' defaults to TRUE because:
 * - CSS files from CDNs like Google Fonts often have no extension (e.g., /css2?family=Inter)
 * - JS files from CDNs may not have .js extension
 * - Essential resources should not be blocked due to missing extension
 */
export const fileTypesSchema = z.object({
    html: z.boolean().default(true),
    css: z.boolean().default(true),
    js: z.boolean().default(true),
    images: z.boolean().default(true),
    fonts: z.boolean().default(true),
    media: z.boolean().default(true),
    documents: z.boolean().default(true),
    other: z.boolean().default(true),  // IMPORTANT: Must be true to download CDN resources without extensions
});

/**
 * URL pattern for include/exclude rules.
 */
export const urlPatternSchema = z
    .string()
    .max(500, 'Pattern too long')
    .refine(
        (val) => {
            // Basic glob pattern validation
            try {
                // Check for dangerous patterns
                if (val.includes('..')) return false;
                return true;
            } catch {
                return false;
            }
        },
        { message: 'Invalid URL pattern' }
    );

/**
 * Complete crawl options schema.
 */
export const crawlOptionsSchema = z.object({
    // Target URL
    url: urlSchema,

    // Scope
    scope: scopeSchema,
    customDomains: z.array(z.string().max(253)).max(10).optional(),
    includePaths: z.array(urlPatternSchema).max(20).optional(),
    excludePaths: z.array(urlPatternSchema).max(20).optional(),

    // Unlimited Mode - removes most restrictions
    unlimitedMode: z.boolean().default(false),

    // Limits (significantly increased - these are overridden if unlimitedMode is true)
    maxDepth: z.number().int().min(1).max(1000).default(50),
    maxPages: z.number().int().min(1).max(1000000).default(10000),
    maxFileSize: z.number().int().min(1024).max(500 * 1024 * 1024).default(50 * 1024 * 1024), // 50MB default
    maxTotalSize: z.number().int().min(1024).max(10 * 1024 * 1024 * 1024).default(1024 * 1024 * 1024), // 1GB default

    // File types
    fileTypes: fileTypesSchema.optional(),

    // Crawler behavior
    concurrency: z.number().int().min(1).max(50).default(5),
    delayMs: z.number().int().min(0).max(10000).default(100),
    timeoutMs: z.number().int().min(1000).max(300000).default(60000), // 60s default timeout

    // Headers
    userAgent: z.string().max(500).optional(),
    cookies: z.string().max(10000).optional(),
    customHeaders: z.record(z.string().max(100), z.string().max(1000)).optional(),

    // Robots.txt
    respectRobotsTxt: z.boolean().default(false),

    // Other
    followRedirects: z.boolean().default(true),
    maxRedirects: z.number().int().min(0).max(50).default(10),
});

export type CrawlOptions = z.infer<typeof crawlOptionsSchema>;

/**
 * Job ID validation.
 */
export const jobIdSchema = z
    .string()
    .uuid('Invalid job ID format');

/**
 * Sanitize a filename to prevent path traversal and illegal characters.
 */
export function sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '_');

    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

    // Replace illegal characters
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

    // Limit length
    if (sanitized.length > 200) {
        const ext = sanitized.slice(sanitized.lastIndexOf('.'));
        const base = sanitized.slice(0, 200 - ext.length);
        sanitized = base + ext;
    }

    // Ensure not empty
    if (!sanitized) {
        sanitized = 'unnamed';
    }

    return sanitized;
}

/**
 * Sanitize a path to prevent traversal attacks.
 */
export function sanitizePath(path: string): string {
    // Split by path separators
    const parts = path.split(/[/\\]/);

    // Filter out dangerous parts
    const safeParts = parts
        .map(sanitizeFilename)
        .filter((part) => part && part !== '.' && part !== '..');

    return safeParts.join('/');
}

/**
 * Validate that a path is within a base directory.
 */
export function isPathWithinBase(basePath: string, targetPath: string): boolean {
    const normalizedBase = basePath.replace(/\\/g, '/').replace(/\/+$/, '');
    const normalizedTarget = targetPath.replace(/\\/g, '/');

    return normalizedTarget.startsWith(normalizedBase + '/') || normalizedTarget === normalizedBase;
}

export default {
    urlSchema,
    crawlOptionsSchema,
    jobIdSchema,
    sanitizeFilename,
    sanitizePath,
    isPathWithinBase,
};
