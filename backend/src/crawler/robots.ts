/**
 * Robots.txt parser and matcher.
 * Provides optional compliance with robots.txt rules.
 */

import robotsParser from 'robots-parser';
import { logger } from '../utils/logger.js';

export interface RobotsRules {
    isAllowed: (url: string, userAgent?: string) => boolean;
    getCrawlDelay: (userAgent?: string) => number | null;
}

/**
 * Fetch and parse robots.txt for a domain.
 */
export async function fetchRobotsTxt(
    baseUrl: string,
    userAgent: string,
    timeoutMs: number = 10000
): Promise<RobotsRules | null> {
    try {
        const url = new URL('/robots.txt', baseUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url.href, {
            method: 'GET',
            headers: {
                'User-Agent': userAgent,
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.debug(`robots.txt not found or error: ${response.status}`, { url: url.href });
            return null;
        }

        const robotsTxt = await response.text();
        const robots = robotsParser(url.href, robotsTxt);

        return {
            isAllowed: (checkUrl: string, ua?: string) => {
                return robots.isAllowed(checkUrl, ua || userAgent) ?? true;
            },
            getCrawlDelay: (ua?: string) => {
                return robots.getCrawlDelay(ua || userAgent) ?? null;
            },
        };
    } catch (error) {
        logger.debug('Failed to fetch robots.txt', {
            baseUrl,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}

/**
 * Create a permissive robots rules object that allows everything.
 */
export function createPermissiveRules(): RobotsRules {
    return {
        isAllowed: () => true,
        getCrawlDelay: () => null,
    };
}

export default {
    fetchRobotsTxt,
    createPermissiveRules,
};
