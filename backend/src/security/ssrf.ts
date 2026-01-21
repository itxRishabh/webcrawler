/**
 * SSRF (Server-Side Request Forgery) protection module.
 * Blocks requests to internal networks, localhost, and cloud metadata endpoints.
 */

import { URL } from 'url';
import * as dns from 'dns';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';

const dnsResolve = promisify(dns.resolve4);

/**
 * Private and reserved IP ranges that should be blocked.
 */
const BLOCKED_IP_RANGES = [
    // Loopback
    { start: ipToNumber('127.0.0.0'), end: ipToNumber('127.255.255.255') },
    // Private networks
    { start: ipToNumber('10.0.0.0'), end: ipToNumber('10.255.255.255') },
    { start: ipToNumber('172.16.0.0'), end: ipToNumber('172.31.255.255') },
    { start: ipToNumber('192.168.0.0'), end: ipToNumber('192.168.255.255') },
    // Link-local
    { start: ipToNumber('169.254.0.0'), end: ipToNumber('169.254.255.255') },
    // Broadcast
    { start: ipToNumber('255.255.255.255'), end: ipToNumber('255.255.255.255') },
    // Current network
    { start: ipToNumber('0.0.0.0'), end: ipToNumber('0.255.255.255') },
];

/**
 * Specific blocked hosts including cloud metadata endpoints.
 */
const BLOCKED_HOSTS = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata.gke.internal',
]);

/**
 * Blocked cloud metadata IPs.
 */
const BLOCKED_METADATA_IPS = new Set([
    '169.254.169.254', // AWS, GCP, Azure metadata
    'fd00:ec2::254',   // AWS IPv6 metadata
]);

/**
 * Convert IPv4 string to number for range comparison.
 */
function ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return -1;
    }
    return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

/**
 * Check if an IP is in a private/reserved range.
 */
function isPrivateIP(ip: string): boolean {
    const ipNum = ipToNumber(ip);
    if (ipNum === -1) return true; // Invalid IP, block it

    for (const range of BLOCKED_IP_RANGES) {
        if (ipNum >= range.start && ipNum <= range.end) {
            return true;
        }
    }

    return BLOCKED_METADATA_IPS.has(ip);
}

/**
 * Check if a hostname is blocked.
 */
function isBlockedHost(hostname: string): boolean {
    const normalized = hostname.toLowerCase();

    if (BLOCKED_HOSTS.has(normalized)) {
        return true;
    }

    // Check if it's an IP address
    const ipMatch = /^(\d{1,3}\.){3}\d{1,3}$/.test(normalized);
    if (ipMatch && isPrivateIP(normalized)) {
        return true;
    }

    // Block IPv6 localhost
    if (normalized === '::1' || normalized === '[::1]') {
        return true;
    }

    return false;
}

export interface SSRFValidationResult {
    safe: boolean;
    reason?: string;
    resolvedIP?: string;
}

/**
 * Validate a URL for SSRF vulnerabilities.
 * This performs DNS resolution to catch DNS rebinding attacks.
 */
export async function validateUrlForSSRF(
    urlString: string,
    allowedProtocols: string[] = ['http', 'https']
): Promise<SSRFValidationResult> {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(urlString);
    } catch {
        return { safe: false, reason: 'Invalid URL format' };
    }

    // Check protocol
    const protocol = parsedUrl.protocol.replace(':', '');
    if (!allowedProtocols.includes(protocol)) {
        return {
            safe: false,
            reason: `Protocol '${protocol}' not allowed. Allowed: ${allowedProtocols.join(', ')}`,
        };
    }

    const hostname = parsedUrl.hostname;

    // Check blocked hosts
    if (isBlockedHost(hostname)) {
        return {
            safe: false,
            reason: `Hostname '${hostname}' is blocked (internal/localhost)`,
        };
    }

    // Resolve DNS to catch rebinding attacks
    try {
        // Check if it's already an IP
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
            if (isPrivateIP(hostname)) {
                return {
                    safe: false,
                    reason: `IP '${hostname}' is in a private/reserved range`,
                };
            }
            return { safe: true, resolvedIP: hostname };
        }

        // Resolve hostname
        const addresses = await dnsResolve(hostname);

        if (!addresses || addresses.length === 0) {
            return { safe: false, reason: `Could not resolve hostname '${hostname}'` };
        }

        // Check all resolved IPs
        for (const ip of addresses) {
            if (isPrivateIP(ip)) {
                logger.warn('DNS rebinding attempt detected', { hostname, resolvedIP: ip });
                return {
                    safe: false,
                    reason: `Resolved IP '${ip}' is in a private/reserved range (possible DNS rebinding)`,
                };
            }
        }

        return { safe: true, resolvedIP: addresses[0] };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { safe: false, reason: `DNS resolution failed: ${message}` };
    }
}

/**
 * Synchronous check for obviously blocked URLs (no DNS resolution).
 * Use validateUrlForSSRF for full protection.
 */
export function isObviouslyBlockedUrl(urlString: string): boolean {
    try {
        const parsedUrl = new URL(urlString);
        return isBlockedHost(parsedUrl.hostname);
    } catch {
        return true; // Invalid URLs are blocked
    }
}

export default {
    validateUrlForSSRF,
    isObviouslyBlockedUrl,
    isPrivateIP,
};
