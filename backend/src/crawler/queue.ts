/**
 * URL Queue for managing the crawl frontier.
 * Implements BFS-based crawling with deduplication and scope filtering.
 */

import { normalizeUrl, isInScope, matchesPattern, getMimeCategory, getExtensionFromUrl } from '../utils/url.js';
import type { CrawlOptions } from '../security/validation.js';

export type UrlStatus = 'pending' | 'in-progress' | 'complete' | 'failed' | 'skipped';

export interface QueuedUrl {
    url: string;
    normalizedUrl: string;
    depth: number;
    parentUrl: string | null;
    status: UrlStatus;
    retries: number;
    addedAt: number;
    processedAt?: number;
    error?: string;
}

export interface QueueStats {
    total: number;
    pending: number;
    inProgress: number;
    complete: number;
    failed: number;
    skipped: number;
}

export class UrlQueue {
    private queue: Map<string, QueuedUrl> = new Map();
    private pendingUrls: string[] = [];
    private options: CrawlOptions;
    private seedUrl: string;

    constructor(seedUrl: string, options: CrawlOptions) {
        this.seedUrl = seedUrl;
        this.options = options;

        // Add seed URL to queue
        const normalized = normalizeUrl(seedUrl);
        if (normalized) {
            const item: QueuedUrl = {
                url: seedUrl,
                normalizedUrl: normalized,
                depth: 0,
                parentUrl: null,
                status: 'pending',
                retries: 0,
                addedAt: Date.now(),
            };
            this.queue.set(normalized, item);
            this.pendingUrls.push(normalized);
        }
    }

    /**
     * Add a URL to the queue if it passes all filters.
     */
    add(url: string, parentUrl: string, depth: number): boolean {
        // Normalize URL
        const normalized = normalizeUrl(url);
        if (!normalized) return false;

        // Check if already in queue
        if (this.queue.has(normalized)) return false;

        // Check depth limit (skip if unlimited mode)
        if (!this.options.unlimitedMode && depth > this.options.maxDepth) return false;

        // Check max pages limit (skip if unlimited mode)
        if (!this.options.unlimitedMode && this.queue.size >= this.options.maxPages) return false;

        // Check scope
        const scope = this.options.scope === 'custom' ? 'same-domain' : this.options.scope;
        if (!isInScope(normalized, this.seedUrl, scope)) return false;

        // Check custom domains if specified
        if (this.options.scope === 'custom' && this.options.customDomains) {
            const urlHost = new URL(normalized).hostname;
            if (!this.options.customDomains.some((d) => urlHost === d || urlHost.endsWith('.' + d))) {
                return false;
            }
        }

        // Check include patterns
        if (this.options.includePaths && this.options.includePaths.length > 0) {
            const matches = this.options.includePaths.some((pattern) =>
                matchesPattern(normalized, pattern)
            );
            if (!matches) return false;
        }

        // Check exclude patterns
        if (this.options.excludePaths && this.options.excludePaths.length > 0) {
            const excluded = this.options.excludePaths.some((pattern) =>
                matchesPattern(normalized, pattern)
            );
            if (excluded) return false;
        }

        // Check file type filters
        if (this.options.fileTypes) {
            const ext = getExtensionFromUrl(normalized);
            const category = getMimeCategory(ext);
            const fileTypes = this.options.fileTypes as Record<string, boolean>;

            // If the category is explicitly disabled, skip
            if (fileTypes[category] === false) {
                return false;
            }
        }

        // Add to queue
        const item: QueuedUrl = {
            url,
            normalizedUrl: normalized,
            depth,
            parentUrl,
            status: 'pending',
            retries: 0,
            addedAt: Date.now(),
        };

        this.queue.set(normalized, item);
        this.pendingUrls.push(normalized);

        return true;
    }

    /**
     * Add an asset URL to the queue, with relaxed scope restrictions.
     * Assets (CSS, JS, images, fonts) are ALWAYS downloaded if they are referenced
     * from an in-scope page, regardless of where they are hosted.
     * This ensures complete offline browsing experience.
     */
    addAsset(url: string, parentUrl: string, depth: number): boolean {
        // Normalize URL
        const normalized = normalizeUrl(url);
        if (!normalized) return false;

        // Check if already in queue
        if (this.queue.has(normalized)) return false;

        // Check depth limit (very relaxed for assets - allow 5 more levels, skip if unlimited mode)
        // This ensures we can follow CSS @import chains and nested resources
        if (!this.options.unlimitedMode && depth > this.options.maxDepth + 5) return false;

        // Check max pages limit (skip if unlimited mode)
        if (!this.options.unlimitedMode && this.queue.size >= this.options.maxPages) return false;

        // Check file type filters
        if (this.options.fileTypes) {
            const ext = getExtensionFromUrl(normalized);
            const category = getMimeCategory(ext);
            const fileTypes = this.options.fileTypes as Record<string, boolean>;

            // If the category is explicitly disabled, skip
            if (fileTypes[category] === false) {
                return false;
            }
        }

        // IMPORTANT: Assets referenced from in-scope pages are ALWAYS downloaded.
        // This is critical because:
        // 1. CSS files may be hosted on CDNs but are required for page styling
        // 2. JS files may be hosted externally but are needed for functionality
        // 3. Images/fonts may be on CDNs like Cloudflare, Google Fonts, etc.
        // 
        // We DO NOT apply scope restrictions to assets - they are downloaded
        // unconditionally as long as they are referenced from a page we crawled.
        // This ensures complete offline browsing capability.

        // Add to queue
        const item: QueuedUrl = {
            url,
            normalizedUrl: normalized,
            depth,
            parentUrl,
            status: 'pending',
            retries: 0,
            addedAt: Date.now(),
        };

        this.queue.set(normalized, item);
        this.pendingUrls.push(normalized);

        return true;
    }

    /**
     * Check if a URL is from a common CDN or asset hosting domain.
     * These domains are commonly used to host images and should be allowed.
     */
    private isAssetHostDomain(url: string): boolean {
        try {
            const hostname = new URL(url).hostname.toLowerCase();

            // Common CDN and asset hosting patterns
            const cdnPatterns = [
                // Subdomain patterns
                /^cdn\./,
                /^static\./,
                /^assets\./,
                /^images?\./,
                /^img\./,
                /^media\./,
                /^files\./,
                /^uploads?\./,
                /^content\./,
                /^res\./,
                /^resources\./,

                // Major CDN providers
                /cloudflare/i,
                /cloudinary/i,
                /imgix/i,
                /akamai/i,
                /fastly/i,
                /amazonaws\.com$/,
                /s3\..*\.amazonaws\.com/,
                /cloudfront\.net$/,
                /azureedge\.net$/,
                /blob\.core\.windows\.net$/,
                /googleapis\.com$/,
                /googleusercontent\.com$/,
                /gstatic\.com$/,
                /fbcdn\.net$/,
                /twimg\.com$/,
                /imgur\.com$/,
                /unsplash\.com$/,
                /pexels\.com$/,
                /pixabay\.com$/,
                /wp\.com$/,
                /wordpress\.com$/,
                /gravatar\.com$/,
                /jsdelivr\.net$/,
                /unpkg\.com$/,
                /cdnjs\.cloudflare\.com$/,
                /bootstrapcdn\.com$/,
                /fontawesome\.com$/,
            ];

            return cdnPatterns.some(pattern => pattern.test(hostname));
        } catch {
            return false;
        }
    }

    /**
     * Get the next URL to process.
     */
    next(): QueuedUrl | null {
        while (this.pendingUrls.length > 0) {
            const normalized = this.pendingUrls.shift();
            if (!normalized) continue;

            const item = this.queue.get(normalized);
            if (!item || item.status !== 'pending') continue;

            item.status = 'in-progress';
            item.processedAt = Date.now();
            return item;
        }

        return null;
    }

    /**
     * Mark a URL as complete.
     */
    complete(normalizedUrl: string): void {
        const item = this.queue.get(normalizedUrl);
        if (item) {
            item.status = 'complete';
        }
    }

    /**
     * Mark a URL as failed.
     */
    fail(normalizedUrl: string, error: string): void {
        const item = this.queue.get(normalizedUrl);
        if (item) {
            item.status = 'failed';
            item.error = error;
        }
    }

    /**
     * Mark a URL as skipped.
     */
    skip(normalizedUrl: string, reason: string): void {
        const item = this.queue.get(normalizedUrl);
        if (item) {
            item.status = 'skipped';
            item.error = reason;
        }
    }

    /**
     * Retry a failed URL.
     */
    retry(normalizedUrl: string, maxRetries: number = 3): boolean {
        const item = this.queue.get(normalizedUrl);
        if (!item || item.retries >= maxRetries) return false;

        item.retries++;
        item.status = 'pending';
        this.pendingUrls.push(normalizedUrl);
        return true;
    }

    /**
     * Check if there are pending URLs.
     */
    hasPending(): boolean {
        return this.pendingUrls.length > 0 || this.hasInProgress();
    }

    /**
     * Check if there are in-progress URLs.
     */
    hasInProgress(): boolean {
        for (const item of this.queue.values()) {
            if (item.status === 'in-progress') return true;
        }
        return false;
    }

    /**
     * Get queue statistics.
     */
    getStats(): QueueStats {
        let pending = 0;
        let inProgress = 0;
        let complete = 0;
        let failed = 0;
        let skipped = 0;

        for (const item of this.queue.values()) {
            switch (item.status) {
                case 'pending':
                    pending++;
                    break;
                case 'in-progress':
                    inProgress++;
                    break;
                case 'complete':
                    complete++;
                    break;
                case 'failed':
                    failed++;
                    break;
                case 'skipped':
                    skipped++;
                    break;
            }
        }

        return {
            total: this.queue.size,
            pending,
            inProgress,
            complete,
            failed,
            skipped,
        };
    }

    /**
     * Get all queue items.
     */
    getAll(): QueuedUrl[] {
        return Array.from(this.queue.values());
    }

    /**
     * Get a specific item by normalized URL.
     */
    get(normalizedUrl: string): QueuedUrl | undefined {
        return this.queue.get(normalizedUrl);
    }

    /**
     * Check if a URL is in the queue.
     */
    has(url: string): boolean {
        const normalized = normalizeUrl(url);
        return normalized ? this.queue.has(normalized) : false;
    }

    /**
     * Get the size of the queue.
     */
    get size(): number {
        return this.queue.size;
    }

    /**
     * Clear the queue.
     */
    clear(): void {
        this.queue.clear();
        this.pendingUrls = [];
    }
}

export default UrlQueue;
