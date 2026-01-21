import 'dotenv/config';

/**
 * Application configuration loaded from environment variables.
 * All values have sensible defaults for development.
 */
export interface Config {
    // Server
    port: number;
    nodeEnv: 'development' | 'production' | 'test';

    // Job Limits
    maxConcurrentJobs: number;
    maxPagesPerJob: number;
    maxFileSizeBytes: number;
    maxTotalSizeBytes: number;
    maxDepth: number;
    defaultTimeoutMs: number;

    // Cleanup
    cleanupIntervalMs: number;
    jobTtlMs: number;

    // Rate Limiting
    rateLimitWindowMs: number;
    rateLimitMax: number;

    // Crawler Defaults
    defaultConcurrency: number;
    defaultDelayMs: number;
    defaultUserAgent: string;

    // Storage
    jobsDir: string;
    tempDir: string;

    // Security
    allowedProtocols: string[];
    blockedHosts: string[];
}

function parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

function parseStringList(value: string | undefined): string[] {
    if (!value || value.trim() === '') return [];
    return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export const config: Config = {
    // Server
    port: parseNumber(process.env['PORT'], 3001),
    nodeEnv: (process.env['NODE_ENV'] as Config['nodeEnv']) || 'development',

    // Job Limits (generous defaults for full site copying)
    maxConcurrentJobs: parseNumber(process.env['MAX_CONCURRENT_JOBS'], 5),
    maxPagesPerJob: parseNumber(process.env['MAX_PAGES_PER_JOB'], 100000),
    maxFileSizeBytes: parseNumber(process.env['MAX_FILE_SIZE_BYTES'], 100 * 1024 * 1024), // 100MB
    maxTotalSizeBytes: parseNumber(process.env['MAX_TOTAL_SIZE_BYTES'], 5 * 1024 * 1024 * 1024), // 5GB
    maxDepth: parseNumber(process.env['MAX_DEPTH'], 100),
    defaultTimeoutMs: parseNumber(process.env['DEFAULT_TIMEOUT_MS'], 60000), // 60s

    // Cleanup
    cleanupIntervalMs: parseNumber(process.env['CLEANUP_INTERVAL_MS'], 60 * 60 * 1000), // 1 hour
    jobTtlMs: parseNumber(process.env['JOB_TTL_MS'], 24 * 60 * 60 * 1000), // 24 hours

    // Rate Limiting
    rateLimitWindowMs: parseNumber(process.env['RATE_LIMIT_WINDOW_MS'], 60 * 1000), // 1 minute
    rateLimitMax: parseNumber(process.env['RATE_LIMIT_MAX'], 10),

    // Crawler Defaults
    defaultConcurrency: parseNumber(process.env['DEFAULT_CONCURRENCY'], 5),
    defaultDelayMs: parseNumber(process.env['DEFAULT_DELAY_MS'], 100),
    defaultUserAgent:
        process.env['DEFAULT_USER_AGENT'] ||
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // Storage
    jobsDir: process.env['JOBS_DIR'] || './jobs',
    tempDir: process.env['TEMP_DIR'] || './temp',

    // Security
    allowedProtocols: (() => {
        const protocols = parseStringList(process.env['ALLOWED_PROTOCOLS']);
        return protocols.length > 0 ? protocols : ['http', 'https'];
    })(),
    blockedHosts: parseStringList(process.env['BLOCKED_HOSTS']),
};

export default config;
