/**
 * URL normalization and utility functions.
 * Handles URL parsing, normalization, and comparison.
 */

import { URL } from 'url';
import { createHash } from 'crypto';
import { sanitizeFilename } from '../security/validation.js';

/**
 * Normalize a URL for consistent comparison and deduplication.
 */
export function normalizeUrl(urlString: string, baseUrl?: string): string | null {
    try {
        let url: URL;

        if (baseUrl) {
            url = new URL(urlString, baseUrl);
        } else {
            url = new URL(urlString);
        }

        // Normalize protocol to lowercase
        url.protocol = url.protocol.toLowerCase();

        // Normalize hostname to lowercase
        url.hostname = url.hostname.toLowerCase();

        // Remove default ports
        if (
            (url.protocol === 'http:' && url.port === '80') ||
            (url.protocol === 'https:' && url.port === '443')
        ) {
            url.port = '';
        }

        // Remove trailing slash from path (except for root)
        if (url.pathname !== '/' && url.pathname.endsWith('/')) {
            url.pathname = url.pathname.slice(0, -1);
        }

        // Sort query parameters for consistent comparison
        if (url.search) {
            const params = new URLSearchParams(url.search);
            const sortedParams = new URLSearchParams([...params.entries()].sort());
            url.search = sortedParams.toString();
        }

        // Remove fragment for deduplication (but preserve for links)
        url.hash = '';

        return url.href;
    } catch {
        return null;
    }
}

/**
 * Get the domain from a URL.
 */
export function getDomain(urlString: string): string | null {
    try {
        const url = new URL(urlString);
        return url.hostname.toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Get the base domain (without subdomains).
 */
export function getBaseDomain(urlString: string): string | null {
    const domain = getDomain(urlString);
    if (!domain) return null;

    // Simple extraction - works for most cases
    const parts = domain.split('.');
    if (parts.length <= 2) return domain;

    // Handle common TLDs like .co.uk, .com.au
    const commonSecondLevelTLDs = ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'];
    const lastPart = parts[parts.length - 2];

    if (lastPart && commonSecondLevelTLDs.includes(lastPart) && parts.length > 2) {
        return parts.slice(-3).join('.');
    }

    return parts.slice(-2).join('.');
}

/**
 * Check if a URL is within the same domain scope.
 */
export function isInScope(
    url: string,
    seedUrl: string,
    scope: 'same-domain' | 'same-host' | 'subdomains'
): boolean {
    const urlDomain = getDomain(url);
    const seedDomain = getDomain(seedUrl);

    if (!urlDomain || !seedDomain) return false;

    switch (scope) {
        case 'same-host':
            return urlDomain === seedDomain;

        case 'same-domain':
            return getBaseDomain(url) === getBaseDomain(seedUrl);

        case 'subdomains':
            const baseDomain = getBaseDomain(seedUrl);
            return urlDomain === baseDomain || urlDomain.endsWith('.' + baseDomain);

        default:
            return false;
    }
}

/**
 * Check if a URL matches a pattern (glob-like).
 */
export function matchesPattern(url: string, pattern: string): boolean {
    try {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
            .replace(/\*/g, '.*') // Convert * to .*
            .replace(/\?/g, '.'); // Convert ? to .

        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(url);
    } catch {
        return false;
    }
}

/**
 * Generate a filesystem-safe path from a URL.
 */
export function urlToFilePath(urlString: string): string {
    try {
        const url = new URL(urlString);

        let path = url.pathname;

        // Handle root path
        if (path === '/' || path === '') {
            path = '/index.html';
        }

        // Handle paths ending with /
        if (path.endsWith('/')) {
            path = path + 'index.html';
        }

        // Handle paths without extension
        const lastSegment = path.split('/').pop() || '';
        if (!lastSegment.includes('.')) {
            path = path + '.html';
        }

        // Handle query strings
        if (url.search) {
            const hash = createHash('md5').update(url.search).digest('hex').slice(0, 8);
            const ext = path.slice(path.lastIndexOf('.'));
            const base = path.slice(0, path.lastIndexOf('.'));
            path = `${base}_${hash}${ext}`;
        }

        // Split path and sanitize each segment
        const segments = path.split('/').filter(Boolean);
        const safeSegments = segments.map(sanitizeFilename);

        // Add domain as root folder
        const domain = sanitizeFilename(url.hostname);

        return [domain, ...safeSegments].join('/');
    } catch {
        // Fallback for invalid URLs
        const hash = createHash('md5').update(urlString).digest('hex');
        return `unknown/${hash}.html`;
    }
}

/**
 * Get the MIME type category for a file extension.
 */
export function getMimeCategory(
    ext: string
): 'html' | 'css' | 'js' | 'images' | 'fonts' | 'media' | 'documents' | 'other' {
    const extension = ext.toLowerCase().replace(/^\./, '');

    const categories: Record<string, 'html' | 'css' | 'js' | 'images' | 'fonts' | 'media' | 'documents'> = {
        // HTML
        html: 'html',
        htm: 'html',
        xhtml: 'html',
        // CSS
        css: 'css',
        scss: 'css',
        sass: 'css',
        less: 'css',
        // JS
        js: 'js',
        mjs: 'js',
        jsx: 'js',
        ts: 'js',
        tsx: 'js',
        // Images
        jpg: 'images',
        jpeg: 'images',
        png: 'images',
        gif: 'images',
        webp: 'images',
        svg: 'images',
        ico: 'images',
        bmp: 'images',
        avif: 'images',
        // Fonts
        woff: 'fonts',
        woff2: 'fonts',
        ttf: 'fonts',
        otf: 'fonts',
        eot: 'fonts',
        // Media
        mp4: 'media',
        webm: 'media',
        ogg: 'media',
        mp3: 'media',
        wav: 'media',
        flac: 'media',
        // Documents
        pdf: 'documents',
        doc: 'documents',
        docx: 'documents',
        xls: 'documents',
        xlsx: 'documents',
        ppt: 'documents',
        pptx: 'documents',
    };

    return categories[extension] || 'other';
}

/**
 * Extract file extension from URL.
 */
export function getExtensionFromUrl(urlString: string): string {
    try {
        const url = new URL(urlString);
        const path = url.pathname;
        const lastDot = path.lastIndexOf('.');
        const lastSlash = path.lastIndexOf('/');

        if (lastDot > lastSlash && lastDot !== -1) {
            return path.slice(lastDot + 1).toLowerCase();
        }

        return '';
    } catch {
        return '';
    }
}

/**
 * Resolve a relative URL against a base URL.
 */
export function resolveUrl(relative: string, base: string): string | null {
    try {
        return new URL(relative, base).href;
    } catch {
        return null;
    }
}

/**
 * Check if a URL is a data URL.
 */
export function isDataUrl(url: string): boolean {
    return url.trim().toLowerCase().startsWith('data:');
}

/**
 * Check if a URL is a blob URL.
 */
export function isBlobUrl(url: string): boolean {
    return url.trim().toLowerCase().startsWith('blob:');
}

/**
 * Check if a URL should be skipped (data URLs, javascript:, mailto:, etc.)
 */
export function shouldSkipUrl(url: string): boolean {
    const trimmed = url.trim().toLowerCase();
    return (
        isDataUrl(trimmed) ||
        isBlobUrl(trimmed) ||
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('tel:') ||
        trimmed.startsWith('sms:') ||
        trimmed.startsWith('#') ||
        trimmed === ''
    );
}

export default {
    normalizeUrl,
    getDomain,
    getBaseDomain,
    isInScope,
    matchesPattern,
    urlToFilePath,
    getMimeCategory,
    getExtensionFromUrl,
    resolveUrl,
    isDataUrl,
    isBlobUrl,
    shouldSkipUrl,
};
