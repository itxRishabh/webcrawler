/**
 * CSS Parser for extracting URLs from CSS content.
 * Uses PostCSS for reliable CSS parsing.
 */

import postcss, { Root, AtRule, Declaration } from 'postcss';
import valueParser from 'postcss-value-parser';
import { resolveUrl, shouldSkipUrl, normalizeUrl } from '../../utils/url.js';

export interface CssUrl {
    url: string;
    type: 'url' | 'import';
}

export interface CssParseResult {
    urls: CssUrl[];
    errors: string[];
}

/**
 * Extract URLs from a CSS value using postcss-value-parser.
 * Handles url(), image-set(), and -webkit-image-set() functions.
 */
function extractUrlsFromValue(value: string): string[] {
    const urls: string[] = [];

    try {
        const parsed = valueParser(value);

        parsed.walk((node) => {
            // Handle url() function
            if (node.type === 'function' && node.value === 'url') {
                const urlNode = node.nodes?.find((n) => n.type === 'string' || n.type === 'word');
                if (urlNode) {
                    urls.push(urlNode.value);
                }
            }

            // Handle image-set() and -webkit-image-set() functions
            if (node.type === 'function' && (node.value === 'image-set' || node.value === '-webkit-image-set')) {
                // image-set contains url() or plain strings followed by resolution
                for (const child of node.nodes || []) {
                    if (child.type === 'function' && child.value === 'url') {
                        const urlNode = child.nodes?.find((n) => n.type === 'string' || n.type === 'word');
                        if (urlNode) {
                            urls.push(urlNode.value);
                        }
                    } else if (child.type === 'string') {
                        // Direct string URL in image-set
                        urls.push(child.value);
                    }
                }
            }

            // Handle cross-fade() function which can contain images
            if (node.type === 'function' && node.value === 'cross-fade') {
                for (const child of node.nodes || []) {
                    if (child.type === 'function' && child.value === 'url') {
                        const urlNode = child.nodes?.find((n) => n.type === 'string' || n.type === 'word');
                        if (urlNode) {
                            urls.push(urlNode.value);
                        }
                    }
                }
            }
        });
    } catch {
        // Fallback regex for malformed CSS
        const urlMatch = value.match(/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi);
        if (urlMatch) {
            for (const match of urlMatch) {
                const url = match.replace(/url\s*\(\s*['"]?|['"]?\s*\)/gi, '');
                if (url) urls.push(url);
            }
        }
        // Also check for image-set with regex fallback
        const imageSetMatch = value.match(/image-set\s*\([^)]+\)/gi);
        if (imageSetMatch) {
            for (const match of imageSetMatch) {
                const innerUrls = match.match(/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi);
                if (innerUrls) {
                    for (const innerMatch of innerUrls) {
                        const url = innerMatch.replace(/url\s*\(\s*['"]?|['"]?\s*\)/gi, '');
                        if (url) urls.push(url);
                    }
                }
            }
        }
    }

    return urls;
}

/**
 * Parse CSS content and extract all URLs.
 */
export function parseCss(css: string, cssUrl: string): CssParseResult {
    const urls: CssUrl[] = [];
    const errors: string[] = [];
    const seenUrls = new Set<string>();

    try {
        const root: Root = postcss.parse(css, { from: cssUrl });

        // Walk through all nodes
        root.walk((node) => {
            try {
                // Handle @import rules
                if (node.type === 'atrule' && (node as AtRule).name === 'import') {
                    const atRule = node as AtRule;
                    const params = atRule.params;

                    // @import url("...")
                    const urlUrls = extractUrlsFromValue(params);
                    for (const url of urlUrls) {
                        if (!shouldSkipUrl(url)) {
                            const resolved = resolveUrl(url, cssUrl);
                            if (resolved && !seenUrls.has(resolved)) {
                                seenUrls.add(resolved);
                                urls.push({ url: resolved, type: 'import' });
                            }
                        }
                    }

                    // @import "..." (without url())
                    const directMatch = params.match(/^['"]([^'"]+)['"]/);
                    if (directMatch?.[1]) {
                        const url = directMatch[1];
                        if (!shouldSkipUrl(url)) {
                            const resolved = resolveUrl(url, cssUrl);
                            if (resolved && !seenUrls.has(resolved)) {
                                seenUrls.add(resolved);
                                urls.push({ url: resolved, type: 'import' });
                            }
                        }
                    }
                }

                // Handle declarations with url() or image-set()
                if (node.type === 'decl') {
                    const decl = node as Declaration;
                    const value = decl.value;
                    const prop = decl.prop.toLowerCase();

                    // List of CSS properties that can contain image URLs
                    const imageProperties = [
                        'background', 'background-image',
                        'mask', 'mask-image', '-webkit-mask', '-webkit-mask-image',
                        'list-style', 'list-style-image',
                        'border-image', 'border-image-source',
                        'cursor',
                        'content',
                        'filter', // for url() in filter
                        'clip-path', // for url()
                        'shape-outside', // for url()
                        'src', // for @font-face
                    ];

                    // Check if the value contains URL functions or if property commonly has URLs
                    const hasUrlFunction = value.includes('url(') ||
                        value.includes('image-set(') ||
                        value.includes('-webkit-image-set(');

                    const isImageProperty = imageProperties.some(p => prop === p || prop.startsWith(p + '-'));

                    if (hasUrlFunction || isImageProperty) {
                        const extractedUrls = extractUrlsFromValue(value);
                        for (const url of extractedUrls) {
                            if (!shouldSkipUrl(url)) {
                                const resolved = resolveUrl(url, cssUrl);
                                if (resolved && !seenUrls.has(resolved)) {
                                    seenUrls.add(resolved);
                                    urls.push({ url: resolved, type: 'url' });
                                }
                            }
                        }
                    }
                }
            } catch (nodeError) {
                errors.push(`Error processing node: ${nodeError}`);
            }
        });
    } catch (parseError) {
        errors.push(`CSS parse error: ${parseError}`);

        // Fallback: use regex for extraction
        const fallbackUrls = extractUrlsWithRegex(css, cssUrl);
        for (const url of fallbackUrls) {
            if (!seenUrls.has(url.url)) {
                seenUrls.add(url.url);
                urls.push(url);
            }
        }
    }

    return { urls, errors };
}

/**
 * Fallback regex extraction for malformed CSS.
 */
function extractUrlsWithRegex(css: string, cssUrl: string): CssUrl[] {
    const urls: CssUrl[] = [];

    // Match url() references
    const urlPattern = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
    let match;
    while ((match = urlPattern.exec(css)) !== null) {
        const url = match[1];
        if (url && !shouldSkipUrl(url)) {
            const resolved = resolveUrl(url, cssUrl);
            if (resolved) {
                urls.push({ url: resolved, type: 'url' });
            }
        }
    }

    // Match @import references
    const importPattern = /@import\s+(?:url\s*\(\s*)?['"]([^'"]+)['"]\s*\)?/gi;
    while ((match = importPattern.exec(css)) !== null) {
        const url = match[1];
        if (url && !shouldSkipUrl(url)) {
            const resolved = resolveUrl(url, cssUrl);
            if (resolved) {
                urls.push({ url: resolved, type: 'import' });
            }
        }
    }

    return urls;
}

/**
 * Rewrite URLs in CSS content to use local paths.
 */
export function rewriteCssUrls(
    css: string,
    urlToLocalPath: Map<string, string>,
    toRoot: string
): string {
    let result = css;

    try {
        const root: Root = postcss.parse(css);

        root.walk((node) => {
            // Handle @import
            if (node.type === 'atrule' && (node as AtRule).name === 'import') {
                const atRule = node as AtRule;
                let params = atRule.params;

                // Rewrite url() in @import
                params = params.replace(
                    /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi,
                    (match, url) => {
                        if (shouldSkipUrl(url)) return match;
                        const normalized = normalizeUrl(url);
                        if (!normalized) return match;
                        const localPath = urlToLocalPath.get(normalized);
                        return localPath ? `url('${toRoot}${localPath}')` : match;
                    }
                );

                // Rewrite direct string in @import
                params = params.replace(
                    /^['"]([^'"]+)['"]/,
                    (match, url) => {
                        if (shouldSkipUrl(url)) return match;
                        const normalized = normalizeUrl(url);
                        if (!normalized) return match;
                        const localPath = urlToLocalPath.get(normalized);
                        return localPath ? `'${toRoot}${localPath}'` : match;
                    }
                );

                atRule.params = params;
            }

            // Handle declarations with url()
            if (node.type === 'decl') {
                const decl = node as Declaration;

                if (decl.value.includes('url(')) {
                    decl.value = decl.value.replace(
                        /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi,
                        (match, url) => {
                            if (shouldSkipUrl(url)) return match;
                            const normalized = normalizeUrl(url);
                            if (!normalized) return match;
                            const localPath = urlToLocalPath.get(normalized);
                            return localPath ? `url('${toRoot}${localPath}')` : match;
                        }
                    );
                }
            }
        });

        result = root.toString();
    } catch {
        // Fallback: regex-based rewriting
        result = css.replace(
            /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi,
            (match, url) => {
                if (shouldSkipUrl(url)) return match;
                const normalized = normalizeUrl(url);
                if (!normalized) return match;
                const localPath = urlToLocalPath.get(normalized);
                return localPath ? `url('${toRoot}${localPath}')` : match;
            }
        );

        result = result.replace(
            /@import\s+['"]([^'"]+)['"]/gi,
            (match, url) => {
                if (shouldSkipUrl(url)) return match;
                const normalized = normalizeUrl(url);
                if (!normalized) return match;
                const localPath = urlToLocalPath.get(normalized);
                return localPath ? `@import '${toRoot}${localPath}'` : match;
            }
        );
    }

    return result;
}

export default {
    parseCss,
    rewriteCssUrls,
};
