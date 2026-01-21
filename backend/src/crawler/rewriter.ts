/**
 * Link rewriting engine.
 * Converts absolute URLs to relative filesystem paths.
 */

import { createHash } from 'crypto';
import { sanitizeFilename, sanitizePath } from '../security/validation.js';
import { normalizeUrl } from '../utils/url.js';

/**
 * Map of URL to local filesystem path.
 */
export class LinkRewriter {
    private urlToPath: Map<string, string> = new Map();
    private pathToUrl: Map<string, string> = new Map();
    private usedPaths: Set<string> = new Set();

    /**
     * Register a URL and get its local path.
     */
    registerUrl(url: string): string {
        const normalized = normalizeUrl(url);
        if (!normalized) {
            throw new Error(`Invalid URL: ${url}`);
        }

        // Check if already registered
        const existing = this.urlToPath.get(normalized);
        if (existing) {
            return existing;
        }

        // Generate local path
        const localPath = this.generateLocalPath(url);

        // Ensure unique path
        const uniquePath = this.ensureUniquePath(localPath);

        // Store mappings
        this.urlToPath.set(normalized, uniquePath);
        this.pathToUrl.set(uniquePath, normalized);
        this.usedPaths.add(uniquePath);

        return uniquePath;
    }

    /**
     * Get the local path for a URL.
     */
    getLocalPath(url: string): string | undefined {
        const normalized = normalizeUrl(url);
        return normalized ? this.urlToPath.get(normalized) : undefined;
    }

    /**
     * Get all URL to path mappings.
     */
    getMappings(): Map<string, string> {
        return new Map(this.urlToPath);
    }

    /**
     * Generate a local filesystem path from a URL.
     */
    private generateLocalPath(urlString: string): string {
        const url = new URL(urlString);

        // Start with domain
        const domain = sanitizeFilename(url.hostname);

        // Get pathname
        let pathname = url.pathname;

        // Handle root path
        if (pathname === '/' || pathname === '') {
            pathname = '/index.html';
        }

        // Handle directory paths (ending with /)
        if (pathname.endsWith('/')) {
            pathname = pathname + 'index.html';
        }

        // Handle paths without extension (likely HTML pages)
        const lastSegment = pathname.split('/').pop() || '';
        if (!lastSegment.includes('.')) {
            pathname = pathname + '.html';
        }

        // Handle query strings by hashing them
        let queryHash = '';
        if (url.search) {
            queryHash = '_' + createHash('md5').update(url.search).digest('hex').slice(0, 8);

            // Insert hash before extension
            const lastDot = pathname.lastIndexOf('.');
            if (lastDot !== -1) {
                pathname = pathname.slice(0, lastDot) + queryHash + pathname.slice(lastDot);
            } else {
                pathname = pathname + queryHash;
            }
        }

        // Split and sanitize each path segment
        const segments = pathname.split('/').filter(Boolean);
        const safeSegments = segments.map((segment) => {
            // Handle very long filenames
            if (segment.length > 200) {
                const ext = segment.slice(segment.lastIndexOf('.'));
                const base = segment.slice(0, 150);
                const hash = createHash('md5').update(segment).digest('hex').slice(0, 8);
                return sanitizeFilename(base + '_' + hash + ext);
            }
            return sanitizeFilename(segment);
        });

        // Combine domain and path
        return sanitizePath([domain, ...safeSegments].join('/'));
    }

    /**
     * Ensure a path is unique by adding a suffix if needed.
     */
    private ensureUniquePath(path: string): string {
        if (!this.usedPaths.has(path)) {
            return path;
        }

        // Find extension
        const lastDot = path.lastIndexOf('.');
        const base = lastDot !== -1 ? path.slice(0, lastDot) : path;
        const ext = lastDot !== -1 ? path.slice(lastDot) : '';

        // Add incrementing suffix
        let counter = 1;
        let newPath = `${base}_${counter}${ext}`;

        while (this.usedPaths.has(newPath)) {
            counter++;
            newPath = `${base}_${counter}${ext}`;

            // Safety limit
            if (counter > 10000) {
                const hash = createHash('md5').update(path + Date.now()).digest('hex').slice(0, 8);
                return `${base}_${hash}${ext}`;
            }
        }

        return newPath;
    }

    /**
     * Calculate relative path from one file to another.
     */
    static getRelativePath(fromPath: string, toPath: string): string {
        const fromParts = fromPath.split('/');
        const toParts = toPath.split('/');

        // Remove filename from 'from' path
        fromParts.pop();

        // Find common prefix
        let commonLength = 0;
        while (
            commonLength < fromParts.length &&
            commonLength < toParts.length &&
            fromParts[commonLength] === toParts[commonLength]
        ) {
            commonLength++;
        }

        // Calculate path up
        const upCount = fromParts.length - commonLength;
        const upPath = '../'.repeat(upCount);

        // Add remaining path down
        const downPath = toParts.slice(commonLength).join('/');

        const result = upPath + downPath;
        return result || './';
    }

    /**
     * Get the number of registered URLs.
     */
    get size(): number {
        return this.urlToPath.size;
    }

    /**
     * Clear all mappings.
     */
    clear(): void {
        this.urlToPath.clear();
        this.pathToUrl.clear();
        this.usedPaths.clear();
    }
}

export default LinkRewriter;
