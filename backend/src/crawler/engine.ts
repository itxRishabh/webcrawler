/**
 * Main Crawler Engine.
 * Orchestrates the crawling process: fetching, parsing, rewriting, and storing.
 */

import { EventEmitter } from 'events';
import { UrlQueue, QueueStats, QueuedUrl } from './queue.js';
import { Fetcher, FetchResult } from './fetcher.js';
import { parseHtml, rewriteHtmlLinks } from './parsers/html.js';
import { parseCss, rewriteCssUrls } from './parsers/css.js';
import { fetchRobotsTxt, createPermissiveRules, RobotsRules } from './robots.js';
import { LinkRewriter } from './rewriter.js';
import { FileStorage, StorageStats } from '../storage/filesystem.js';
import { normalizeUrl, getMimeCategory, getExtensionFromUrl } from '../utils/url.js';
import { logger, LogContext } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { CrawlOptions } from '../security/validation.js';

export type CrawlStatus =
    | 'pending'
    | 'running'
    | 'paused'
    | 'complete'
    | 'failed'
    | 'cancelled';

export interface CrawlProgress {
    status: CrawlStatus;
    pagesProcessed: number;
    totalPages: number;
    assetsProcessed: number;
    bytesDownloaded: number;
    currentUrl: string | null;
    errors: number;
    startedAt: number;
    elapsedMs: number;
    queueStats: QueueStats;
    storageStats: StorageStats;
}

export interface CrawlResult {
    success: boolean;
    pagesProcessed: number;
    assetsProcessed: number;
    bytesDownloaded: number;
    errors: CrawlError[];
    duration: number;
    archivePath?: string;
}

export interface CrawlError {
    url: string;
    error: string;
    timestamp: number;
}

export interface CrawlEngineEvents {
    progress: (progress: CrawlProgress) => void;
    log: (level: string, message: string, context?: LogContext) => void;
    complete: (result: CrawlResult) => void;
    error: (error: Error) => void;
}

export class CrawlEngine extends EventEmitter {
    private jobId: string;
    private options: CrawlOptions;
    private queue: UrlQueue;
    private fetcher: Fetcher;
    private rewriter: LinkRewriter;
    private storage: FileStorage;
    private robotsRules: RobotsRules | null = null;

    private status: CrawlStatus = 'pending';
    private startTime: number = 0;
    private errors: CrawlError[] = [];
    private pagesProcessed: number = 0;
    private assetsProcessed: number = 0;
    private currentUrl: string | null = null;
    private aborted: boolean = false;

    constructor(jobId: string, url: string, options: CrawlOptions) {
        super();
        this.jobId = jobId;
        this.options = options;
        this.queue = new UrlQueue(url, options);
        this.fetcher = new Fetcher(options);
        this.rewriter = new LinkRewriter();
        this.storage = new FileStorage(jobId);
    }

    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: LogContext): void {
        const fullContext = { jobId: this.jobId, ...context };
        logger[level](message, fullContext);
        this.emit('log', level, message, fullContext);
    }

    /**
     * Start the crawl.
     */
    async start(): Promise<CrawlResult> {
        if (this.status !== 'pending' && this.status !== 'paused') {
            throw new Error(`Cannot start crawl in status: ${this.status}`);
        }

        this.status = 'running';
        this.startTime = Date.now();
        this.log('info', 'Starting crawl', { url: this.options.url });

        try {
            // Initialize storage
            await this.storage.init();

            // Fetch robots.txt if enabled
            if (this.options.respectRobotsTxt) {
                this.log('debug', 'Fetching robots.txt');
                this.robotsRules = await fetchRobotsTxt(
                    this.options.url,
                    this.options.userAgent || config.defaultUserAgent,
                    this.options.timeoutMs
                );

                if (this.robotsRules) {
                    this.log('info', 'robots.txt loaded, will respect rules');
                }
            } else {
                this.robotsRules = createPermissiveRules();
            }

            // Main crawl loop
            await this.crawlLoop();

            // Rewrite links in all downloaded files
            await this.rewriteAllLinks();

            this.status = this.aborted ? 'cancelled' : 'complete';
            this.log('info', 'Crawl complete', {
                pages: this.pagesProcessed,
                assets: this.assetsProcessed,
                errors: this.errors.length,
            });

            const result: CrawlResult = {
                success: !this.aborted && this.errors.length === 0,
                pagesProcessed: this.pagesProcessed,
                assetsProcessed: this.assetsProcessed,
                bytesDownloaded: this.storage.getStats().totalBytes,
                errors: this.errors,
                duration: Date.now() - this.startTime,
            };

            this.emit('complete', result);
            return result;
        } catch (error) {
            this.status = 'failed';
            const err = error instanceof Error ? error : new Error(String(error));
            this.log('error', 'Crawl failed', { error: err.message });
            this.emit('error', err);
            throw err;
        }
    }

    /**
     * Main crawl loop.
     */
    private async crawlLoop(): Promise<void> {
        const activeFetches: Promise<void>[] = [];

        while (this.queue.hasPending() && !this.aborted) {
            // Check if paused
            if (this.status === 'paused') {
                await this.waitForResume();
                if (this.aborted) break;
            }

            // Get next URL from queue
            const item = this.queue.next();
            if (!item) {
                // Wait for any active fetches to complete
                if (activeFetches.length > 0) {
                    await Promise.race(activeFetches);
                    continue;
                }
                break;
            }

            // Check robots.txt
            if (this.robotsRules && !this.robotsRules.isAllowed(item.url)) {
                this.queue.skip(item.normalizedUrl, 'Blocked by robots.txt');
                this.log('debug', 'Skipped by robots.txt', { url: item.url });
                continue;
            }

            // Start fetch
            const fetchPromise = this.processUrl(item)
                .finally(() => {
                    const index = activeFetches.indexOf(fetchPromise);
                    if (index !== -1) {
                        activeFetches.splice(index, 1);
                    }
                });

            activeFetches.push(fetchPromise);

            // Limit active fetches
            if (activeFetches.length >= this.options.concurrency) {
                await Promise.race(activeFetches);
            }

            // Emit progress
            this.emitProgress();
        }

        // Wait for all remaining fetches
        await Promise.all(activeFetches);
    }

    /**
     * Process a single URL.
     */
    private async processUrl(item: QueuedUrl): Promise<void> {
        this.currentUrl = item.url;

        try {
            // Fetch the URL with referer for anti-detection
            const result = await this.fetcher.fetch(item.url, item.parentUrl || undefined);

            if (!result.success) {
                this.queue.fail(item.normalizedUrl, result.error.error);
                this.errors.push({
                    url: item.url,
                    error: result.error.error,
                    timestamp: Date.now(),
                });
                this.log('warn', `Failed to fetch: ${result.error.error}`, { url: item.url });
                return;
            }

            const fetchResult = result.result;

            // Register URL in rewriter
            const localPath = this.rewriter.registerUrl(fetchResult.finalUrl);

            // Handle redirects
            if (fetchResult.isRedirect) {
                this.rewriter.registerUrl(item.url);
                this.log('debug', `Redirect: ${item.url} -> ${fetchResult.finalUrl}`);
            }

            // Determine content type
            const contentType = fetchResult.contentType.split(';')[0]?.trim().toLowerCase() || '';
            const isHtml = contentType.includes('html');
            const isCss = contentType.includes('css');

            // Save content
            await this.storage.writeFile(localPath, fetchResult.body);

            // Parse content for links
            if (isHtml) {
                this.pagesProcessed++;
                await this.processHtml(fetchResult, item.depth);
            } else if (isCss) {
                this.assetsProcessed++;
                await this.processCss(fetchResult, item.depth);
            } else {
                this.assetsProcessed++;
            }

            this.queue.complete(item.normalizedUrl);
            this.log('debug', `Downloaded: ${localPath}`, {
                url: item.url,
                size: fetchResult.contentLength
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.queue.fail(item.normalizedUrl, errorMessage);
            this.errors.push({
                url: item.url,
                error: errorMessage,
                timestamp: Date.now(),
            });
            this.log('error', `Error processing URL: ${errorMessage}`, { url: item.url });
        }
    }

    /**
     * Process HTML content.
     */
    private async processHtml(result: FetchResult, depth: number): Promise<void> {
        const html = result.body.toString('utf-8');
        const parseResult = parseHtml(html, result.finalUrl);

        for (const link of parseResult.links) {
            const normalized = normalizeUrl(link.url);
            if (!normalized) continue;

            // Trust the parser's classification: if it says it's an asset, treat it as one
            // The parser correctly identifies stylesheets, scripts, images, etc. as assets
            // Only <a href> links are classified as 'page'
            if (link.type === 'asset') {
                // Use addAsset for all assets - no scope restrictions
                this.queue.addAsset(link.url, result.finalUrl, depth);
            } else {
                // Add navigational links as pages with depth increment
                this.queue.add(link.url, result.finalUrl, depth + 1);
            }
        }
    }

    /**
     * Process CSS content.
     */
    private async processCss(result: FetchResult, depth: number): Promise<void> {
        const css = result.body.toString('utf-8');
        const parseResult = parseCss(css, result.finalUrl);

        for (const { url } of parseResult.urls) {
            // All CSS URLs are assets (images, fonts, other CSS files)
            this.queue.addAsset(url, result.finalUrl, depth);
        }
    }

    /**
     * Rewrite links in all downloaded files.
     */
    private async rewriteAllLinks(): Promise<void> {
        this.log('info', 'Rewriting links in downloaded files');

        const files = await this.storage.listFiles();
        const urlToPath = this.rewriter.getMappings();

        for (const file of files) {
            try {
                const ext = getExtensionFromUrl(file);
                const category = getMimeCategory(ext);

                if (category !== 'html' && category !== 'css') continue;

                const content = await this.storage.readFile(file);
                let rewritten: string;

                if (category === 'html') {
                    rewritten = rewriteHtmlLinks(
                        content.toString('utf-8'),
                        urlToPath,
                        file
                    );
                } else {
                    // For CSS, calculate path to root
                    const depth = file.split('/').length - 1;
                    const toRoot = depth > 0 ? '../'.repeat(depth) : './';
                    rewritten = rewriteCssUrls(
                        content.toString('utf-8'),
                        urlToPath,
                        toRoot
                    );
                }

                await this.storage.writeFile(file, rewritten);
                this.log('debug', `Rewrote links in: ${file}`);
            } catch (error) {
                this.log('warn', `Failed to rewrite links in: ${file}`, {
                    error: String(error)
                });
            }
        }
    }

    /**
     * Wait for resume when paused.
     */
    private async waitForResume(): Promise<void> {
        return new Promise((resolve) => {
            const check = (): void => {
                if (this.status !== 'paused' || this.aborted) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    /**
     * Emit progress update.
     */
    private emitProgress(): void {
        const progress: CrawlProgress = {
            status: this.status,
            pagesProcessed: this.pagesProcessed,
            totalPages: this.queue.size,
            assetsProcessed: this.assetsProcessed,
            bytesDownloaded: this.storage.getStats().totalBytes,
            currentUrl: this.currentUrl,
            errors: this.errors.length,
            startedAt: this.startTime,
            elapsedMs: Date.now() - this.startTime,
            queueStats: this.queue.getStats(),
            storageStats: this.storage.getStats(),
        };

        this.emit('progress', progress);
    }

    /**
     * Pause the crawl.
     */
    pause(): void {
        if (this.status === 'running') {
            this.status = 'paused';
            this.fetcher.pause();
            this.log('info', 'Crawl paused');
        }
    }

    /**
     * Resume the crawl.
     */
    resume(): void {
        if (this.status === 'paused') {
            this.status = 'running';
            this.fetcher.resume();
            this.log('info', 'Crawl resumed');
        }
    }

    /**
     * Cancel the crawl.
     */
    cancel(): void {
        this.aborted = true;
        this.status = 'cancelled';
        this.fetcher.abort();
        this.log('info', 'Crawl cancelled');
    }

    /**
     * Get current progress.
     */
    getProgress(): CrawlProgress {
        return {
            status: this.status,
            pagesProcessed: this.pagesProcessed,
            totalPages: this.queue.size,
            assetsProcessed: this.assetsProcessed,
            bytesDownloaded: this.storage.getStats().totalBytes,
            currentUrl: this.currentUrl,
            errors: this.errors.length,
            startedAt: this.startTime,
            elapsedMs: this.startTime ? Date.now() - this.startTime : 0,
            queueStats: this.queue.getStats(),
            storageStats: this.storage.getStats(),
        };
    }

    /**
     * Get the storage instance.
     */
    getStorage(): FileStorage {
        return this.storage;
    }

    /**
     * Get all errors.
     */
    getErrors(): CrawlError[] {
        return [...this.errors];
    }
}

export default CrawlEngine;
