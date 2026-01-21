/**
 * HTTP Fetcher with advanced anti-detection, retry logic, and rate limiting.
 * Uses native fetch with concurrency control via p-queue.
 * 
 * Features:
 * - Realistic browser fingerprinting
 * - User-Agent rotation
 * - Proper Referer headers
 * - Smart retry with exponential backoff + jitter
 * - Rate limit (429) handling with Retry-After support
 * - Random delays to avoid detection
 * - Cookie persistence per domain
 */

import PQueue from 'p-queue';
import { CookieJar, Cookie } from 'tough-cookie';
import { validateUrlForSSRF } from '../security/ssrf.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { CrawlOptions } from '../security/validation.js';

export interface FetchResult {
    url: string;
    finalUrl: string;
    status: number;
    headers: Record<string, string>;
    contentType: string;
    contentLength: number;
    body: Buffer;
    isRedirect: boolean;
    redirectChain: string[];
}

export interface FetchError {
    url: string;
    error: string;
    code?: string;
    retryable: boolean;
}

export type FetchOutcome =
    | { success: true; result: FetchResult }
    | { success: false; error: FetchError };

/**
 * Realistic browser User-Agents for rotation.
 * Updated to latest browser versions for maximum compatibility.
 */
const USER_AGENTS = [
    // Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    // Chrome on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    // Firefox on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    // Safari on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

/**
 * Accept headers for different content types.
 */
const ACCEPT_HEADERS: Record<string, string> = {
    html: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    css: 'text/css,*/*;q=0.1',
    js: '*/*',
    image: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    font: 'application/font-woff2;q=1.0,application/font-woff;q=0.9,*/*;q=0.8',
    default: '*/*',
};

export class Fetcher {
    private queue: PQueue;
    private cookieJar: CookieJar;
    private options: CrawlOptions;
    private aborted: boolean = false;
    private userAgent: string;
    private userAgentIndex: number = 0;
    private rateLimitedUntil: Map<string, number> = new Map();
    private baseDelayMs: number;
    private seedUrl: string;

    constructor(options: CrawlOptions) {
        this.options = options;
        this.seedUrl = options.url;
        this.baseDelayMs = options.delayMs;

        // Use provided user agent or pick a random one
        this.userAgent = options.userAgent || this.getRandomUserAgent();

        this.queue = new PQueue({
            concurrency: options.concurrency,
            interval: options.delayMs,
            intervalCap: 1,
        });

        this.cookieJar = new CookieJar();

        // Parse initial cookies if provided
        if (options.cookies) {
            this.parseCookies(options.cookies, options.url);
        }
    }

    /**
     * Get a random User-Agent from the pool.
     */
    private getRandomUserAgent(): string {
        return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
    }

    /**
     * Rotate to next User-Agent (for retries).
     */
    private rotateUserAgent(): void {
        this.userAgentIndex = (this.userAgentIndex + 1) % USER_AGENTS.length;
        this.userAgent = USER_AGENTS[this.userAgentIndex]!;
    }

    /**
     * Parse and store cookies for the correct domain.
     */
    private parseCookies(cookieString: string, url: string): void {
        try {
            const cookies = cookieString.split(';');
            for (const cookie of cookies) {
                const trimmed = cookie.trim();
                if (trimmed) {
                    try {
                        const parsed = Cookie.parse(trimmed);
                        if (parsed) {
                            this.cookieJar.setCookieSync(parsed, url);
                        }
                    } catch {
                        // Try as raw cookie
                        this.cookieJar.setCookieSync(trimmed, url);
                    }
                }
            }
        } catch (error) {
            logger.warn('Failed to parse cookies', { error: String(error) });
        }
    }

    /**
     * Get domain from URL for rate limiting.
     */
    private getDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    /**
     * Check if domain is rate limited.
     */
    private isRateLimited(url: string): boolean {
        const domain = this.getDomain(url);
        const until = this.rateLimitedUntil.get(domain);
        if (!until) return false;
        if (Date.now() >= until) {
            this.rateLimitedUntil.delete(domain);
            return false;
        }
        return true;
    }

    /**
     * Set rate limit for a domain.
     */
    private setRateLimit(url: string, retryAfterSeconds: number): void {
        const domain = this.getDomain(url);
        this.rateLimitedUntil.set(domain, Date.now() + retryAfterSeconds * 1000);
    }

    /**
     * Add random jitter to delay to avoid detection.
     */
    private addJitter(baseDelay: number): number {
        const jitter = baseDelay * (0.5 + Math.random()); // 50%-150% of base delay
        return Math.floor(jitter);
    }

    /**
     * Get Accept header based on URL extension.
     */
    private getAcceptHeader(url: string): string {
        const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';

        if (['html', 'htm', 'php', 'asp', 'aspx', 'jsp'].includes(ext) || !ext) {
            return ACCEPT_HEADERS['html'] as string;
        }
        if (ext === 'css') return ACCEPT_HEADERS['css'] as string;
        if (['js', 'mjs'].includes(ext)) return ACCEPT_HEADERS['js'] as string;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'avif'].includes(ext)) {
            return ACCEPT_HEADERS['image'] as string;
        }
        if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) {
            return ACCEPT_HEADERS['font'] as string;
        }
        return ACCEPT_HEADERS['default'] as string;
    }

    /**
     * Build realistic browser headers.
     */
    private buildHeaders(url: string, referer?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'User-Agent': this.userAgent,
            'Accept': this.getAcceptHeader(url),
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',

            // Modern browser security headers
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
            'Sec-Fetch-User': '?1',
            'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-CH-UA-Mobile': '?0',
            'Sec-CH-UA-Platform': '"macOS"',

            // DNT header
            'DNT': '1',
        };

        // Add Referer header if provided
        if (referer) {
            headers['Referer'] = referer;
        } else {
            // Use seed URL as default referer
            headers['Referer'] = this.seedUrl;
        }

        // Override with custom headers
        if (this.options.customHeaders) {
            Object.assign(headers, this.options.customHeaders);
        }

        return headers;
    }

    /**
     * Fetch a URL with all protections and policies applied.
     */
    async fetch(url: string, referer?: string): Promise<FetchOutcome> {
        if (this.aborted) {
            return {
                success: false,
                error: { url, error: 'Fetcher aborted', retryable: false },
            };
        }

        // Check rate limiting
        if (this.isRateLimited(url)) {
            const domain = this.getDomain(url);
            const waitTime = (this.rateLimitedUntil.get(domain)! - Date.now()) / 1000;
            logger.debug(`Domain ${domain} is rate limited, waiting ${waitTime}s`);
            await this.delay(waitTime * 1000);
        }

        // Add random delay to avoid detection
        const randomDelay = this.addJitter(this.baseDelayMs);
        await this.delay(randomDelay);

        return this.queue.add(async () => {
            return this.fetchWithRetry(url, referer, 1);
        }) as Promise<FetchOutcome>;
    }

    private async fetchWithRetry(
        url: string,
        referer?: string,
        attempt: number = 1
    ): Promise<FetchOutcome> {
        const maxRetries = 5; // Increased from 3 to 5 for more robustness

        try {
            // SSRF check
            const ssrfResult = await validateUrlForSSRF(url, config.allowedProtocols);
            if (!ssrfResult.safe) {
                return {
                    success: false,
                    error: {
                        url,
                        error: ssrfResult.reason || 'SSRF check failed',
                        retryable: false,
                    },
                };
            }

            // Build headers
            const headers = this.buildHeaders(url, referer);

            // Add cookies
            try {
                const cookies = await this.cookieJar.getCookies(url);
                if (cookies.length > 0) {
                    headers['Cookie'] = cookies.map((c) => c.cookieString()).join('; ');
                }
            } catch {
                // Ignore cookie errors
            }

            // Fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);

            const redirectChain: string[] = [];
            let currentUrl = url;
            let redirectCount = 0;

            try {
                let response: Response;

                // Manual redirect handling to track chain
                while (true) {
                    response = await fetch(currentUrl, {
                        method: 'GET',
                        headers,
                        signal: controller.signal,
                        redirect: 'manual',
                    });

                    // Handle rate limiting (429)
                    if (response.status === 429) {
                        const retryAfter = response.headers.get('retry-after');
                        let waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
                        if (isNaN(waitSeconds)) {
                            // Retry-After might be a date
                            const retryDate = Date.parse(retryAfter!);
                            if (!isNaN(retryDate)) {
                                waitSeconds = Math.max(1, (retryDate - Date.now()) / 1000);
                            } else {
                                waitSeconds = 60;
                            }
                        }

                        this.setRateLimit(url, waitSeconds);

                        if (attempt < maxRetries) {
                            logger.warn(`Rate limited (429), waiting ${waitSeconds}s before retry`, { url });
                            await this.delay(waitSeconds * 1000);
                            this.rotateUserAgent(); // Try different UA
                            return this.fetchWithRetry(url, referer, attempt + 1);
                        }

                        return {
                            success: false,
                            error: {
                                url,
                                error: `Rate limited (429) - Retry-After: ${waitSeconds}s`,
                                code: 'RATE_LIMITED',
                                retryable: false,
                            },
                        };
                    }

                    // Handle 403 Forbidden - might be bot detection
                    if (response.status === 403) {
                        if (attempt < maxRetries) {
                            logger.warn(`Forbidden (403), rotating UA and retrying`, { url, attempt });
                            this.rotateUserAgent();
                            await this.delay(this.addJitter(2000)); // Wait a bit
                            return this.fetchWithRetry(url, referer, attempt + 1);
                        }
                    }

                    // Handle 503 Service Unavailable - often DDoS protection
                    if (response.status === 503) {
                        const retryAfter = response.headers.get('retry-after');
                        const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 5;

                        if (attempt < maxRetries) {
                            logger.warn(`Service unavailable (503), retrying in ${waitSeconds}s`, { url });
                            await this.delay(waitSeconds * 1000);
                            return this.fetchWithRetry(url, referer, attempt + 1);
                        }
                    }

                    // Handle redirects
                    if (
                        this.options.followRedirects &&
                        [301, 302, 303, 307, 308].includes(response.status)
                    ) {
                        const location = response.headers.get('location');
                        if (!location) break;

                        redirectChain.push(currentUrl);
                        currentUrl = new URL(location, currentUrl).href;
                        redirectCount++;

                        if (redirectCount > this.options.maxRedirects) {
                            return {
                                success: false,
                                error: {
                                    url,
                                    error: `Too many redirects (max: ${this.options.maxRedirects})`,
                                    retryable: false,
                                },
                            };
                        }

                        // SSRF check on redirect target
                        const redirectSSRF = await validateUrlForSSRF(currentUrl, config.allowedProtocols);
                        if (!redirectSSRF.safe) {
                            return {
                                success: false,
                                error: {
                                    url,
                                    error: `Redirect to blocked URL: ${redirectSSRF.reason}`,
                                    retryable: false,
                                },
                            };
                        }

                        // Update referer for next request
                        headers['Referer'] = currentUrl;
                        continue;
                    }

                    break;
                }

                clearTimeout(timeoutId);

                // Store all cookies from response
                const setCookieHeaders = response.headers.getSetCookie?.() || [];
                for (const cookieHeader of setCookieHeaders) {
                    try {
                        await this.cookieJar.setCookie(cookieHeader, currentUrl);
                    } catch {
                        // Ignore cookie errors
                    }
                }

                // Also check legacy header
                const setCookieHeader = response.headers.get('set-cookie');
                if (setCookieHeader) {
                    try {
                        await this.cookieJar.setCookie(setCookieHeader, currentUrl);
                    } catch {
                        // Ignore cookie errors
                    }
                }

                // Check content length
                const contentLengthHeader = response.headers.get('content-length');
                const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

                if (contentLength > this.options.maxFileSize) {
                    return {
                        success: false,
                        error: {
                            url,
                            error: `File too large: ${contentLength} bytes (max: ${this.options.maxFileSize})`,
                            retryable: false,
                        },
                    };
                }

                // Read body with size limit
                const chunks: Uint8Array[] = [];
                let totalSize = 0;

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('No response body');
                }

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    totalSize += value.length;
                    if (totalSize > this.options.maxFileSize) {
                        reader.cancel();
                        return {
                            success: false,
                            error: {
                                url,
                                error: `File too large: exceeded ${this.options.maxFileSize} bytes`,
                                retryable: false,
                            },
                        };
                    }

                    chunks.push(value);
                }

                const body = Buffer.concat(chunks);

                // Check for Cloudflare/bot detection pages
                if (response.status === 200) {
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('text/html')) {
                        const html = body.toString('utf-8').toLowerCase();
                        const isBotPage =
                            html.includes('cf-browser-verification') ||
                            html.includes('checking your browser') ||
                            html.includes('ddos-guard') ||
                            html.includes('please wait while we verify') ||
                            html.includes('just a moment') ||
                            html.includes('access denied');

                        if (isBotPage && attempt < maxRetries) {
                            logger.warn('Detected bot protection page, retrying with different UA', { url });
                            this.rotateUserAgent();
                            await this.delay(this.addJitter(3000));
                            return this.fetchWithRetry(url, referer, attempt + 1);
                        }
                    }
                }

                // Convert headers to plain object
                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                const contentType = response.headers.get('content-type') || 'application/octet-stream';

                return {
                    success: true,
                    result: {
                        url,
                        finalUrl: currentUrl,
                        status: response.status,
                        headers: responseHeaders,
                        contentType,
                        contentLength: body.length,
                        body,
                        isRedirect: redirectChain.length > 0,
                        redirectChain,
                    },
                };
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isAbort = errorMessage.includes('abort');
            const isTimeout = isAbort || errorMessage.includes('timeout');
            const isNetwork = errorMessage.includes('ECONNREFUSED') ||
                errorMessage.includes('ENOTFOUND') ||
                errorMessage.includes('ETIMEDOUT') ||
                errorMessage.includes('ECONNRESET') ||
                errorMessage.includes('EPIPE') ||
                errorMessage.includes('socket hang up');

            const retryable = (isTimeout || isNetwork) && attempt < maxRetries;

            if (retryable) {
                // Exponential backoff with jitter
                const baseWait = Math.pow(2, attempt) * 1000;
                const waitTime = this.addJitter(baseWait);
                logger.debug(`Retrying fetch (attempt ${attempt + 1}) after ${waitTime}ms`, { url });
                await this.delay(waitTime);

                // Rotate UA on retries
                if (attempt >= 2) {
                    this.rotateUserAgent();
                }

                return this.fetchWithRetry(url, referer, attempt + 1);
            }

            return {
                success: false,
                error: {
                    url,
                    error: errorMessage,
                    code: isTimeout ? 'TIMEOUT' : isNetwork ? 'NETWORK' : 'UNKNOWN',
                    retryable: false,
                },
            };
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Abort all pending fetches.
     */
    abort(): void {
        this.aborted = true;
        this.queue.clear();
    }

    /**
     * Pause the queue.
     */
    pause(): void {
        this.queue.pause();
    }

    /**
     * Resume the queue.
     */
    resume(): void {
        this.queue.start();
    }

    /**
     * Get queue size.
     */
    get pending(): number {
        return this.queue.pending;
    }

    /**
     * Get number of items being processed.
     */
    get size(): number {
        return this.queue.size;
    }

    /**
     * Wait for all pending fetches to complete.
     */
    async drain(): Promise<void> {
        await this.queue.onIdle();
    }
}

export default Fetcher;
