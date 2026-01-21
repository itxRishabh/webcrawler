/**
 * HTML Parser for extracting links and assets from HTML content.
 * Uses Cheerio for fast HTML parsing.
 */

import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { resolveUrl, shouldSkipUrl, normalizeUrl } from '../../utils/url.js';

/**
 * Helper to get tag name from a Cheerio element.
 */
function getTagName(el: AnyNode): string {
    return (el as Element).tagName || 'unknown';
}

export interface ExtractedLink {
    url: string;
    type: 'page' | 'asset';
    tag: string;
    attribute: string;
}

export interface HtmlParseResult {
    links: ExtractedLink[];
    baseUrl: string | null;
    title: string | null;
}

/**
 * Link extraction selectors.
 * Comprehensive list to capture all possible image and asset sources.
 */
const LINK_SELECTORS: Array<{
    selector: string;
    attribute: string;
    type: 'page' | 'asset';
}> = [
        // Navigation links
        { selector: 'a[href]', attribute: 'href', type: 'page' },

        // Stylesheets
        { selector: 'link[rel="stylesheet"][href]', attribute: 'href', type: 'asset' },
        { selector: 'link[rel="preload"][as="style"][href]', attribute: 'href', type: 'asset' },

        // Scripts
        { selector: 'script[src]', attribute: 'src', type: 'asset' },

        // Images - Standard
        { selector: 'img[src]', attribute: 'src', type: 'asset' },
        { selector: 'img[srcset]', attribute: 'srcset', type: 'asset' },

        // Images - Lazy loading patterns (various libraries/frameworks)
        { selector: 'img[data-src]', attribute: 'data-src', type: 'asset' },
        { selector: 'img[data-srcset]', attribute: 'data-srcset', type: 'asset' },
        { selector: 'img[data-lazy-src]', attribute: 'data-lazy-src', type: 'asset' },
        { selector: 'img[data-lazy-srcset]', attribute: 'data-lazy-srcset', type: 'asset' },
        { selector: 'img[data-original]', attribute: 'data-original', type: 'asset' },
        { selector: 'img[data-lazy]', attribute: 'data-lazy', type: 'asset' },
        { selector: 'img[data-bg]', attribute: 'data-bg', type: 'asset' },
        { selector: 'img[data-image]', attribute: 'data-image', type: 'asset' },
        { selector: 'img[data-full]', attribute: 'data-full', type: 'asset' },
        { selector: 'img[data-large]', attribute: 'data-large', type: 'asset' },
        { selector: 'img[data-hi-res]', attribute: 'data-hi-res', type: 'asset' },
        { selector: 'img[data-zoom-image]', attribute: 'data-zoom-image', type: 'asset' },
        { selector: 'img[data-echo]', attribute: 'data-echo', type: 'asset' },
        { selector: 'img[data-unveiled]', attribute: 'data-unveiled', type: 'asset' },
        { selector: 'img[loading="lazy"][data-src]', attribute: 'data-src', type: 'asset' },

        // Picture and source elements
        { selector: 'picture source[srcset]', attribute: 'srcset', type: 'asset' },
        { selector: 'picture source[data-srcset]', attribute: 'data-srcset', type: 'asset' },
        { selector: 'source[srcset]', attribute: 'srcset', type: 'asset' },
        { selector: 'source[data-srcset]', attribute: 'data-srcset', type: 'asset' },

        // Input type=image
        { selector: 'input[type="image"][src]', attribute: 'src', type: 'asset' },

        // Preloaded images
        { selector: 'link[rel="preload"][as="image"][href]', attribute: 'href', type: 'asset' },
        { selector: 'link[rel="preload"][as="image"][imagesrcset]', attribute: 'imagesrcset', type: 'asset' },

        // SVG images (embedded)
        { selector: 'image[href]', attribute: 'href', type: 'asset' },
        { selector: 'image[xlink\\:href]', attribute: 'xlink:href', type: 'asset' },
        { selector: 'use[href]', attribute: 'href', type: 'asset' },
        { selector: 'use[xlink\\:href]', attribute: 'xlink:href', type: 'asset' },

        // Background images via data attributes (various frameworks)
        { selector: '[data-background]', attribute: 'data-background', type: 'asset' },
        { selector: '[data-background-image]', attribute: 'data-background-image', type: 'asset' },
        { selector: '[data-bg]', attribute: 'data-bg', type: 'asset' },
        { selector: '[data-bg-src]', attribute: 'data-bg-src', type: 'asset' },
        { selector: '[data-image-src]', attribute: 'data-image-src', type: 'asset' },
        { selector: '[data-thumb]', attribute: 'data-thumb', type: 'asset' },
        { selector: '[data-poster]', attribute: 'data-poster', type: 'asset' },
        { selector: '[data-src-retina]', attribute: 'data-src-retina', type: 'asset' },

        // Media
        { selector: 'video[src]', attribute: 'src', type: 'asset' },
        { selector: 'video source[src]', attribute: 'src', type: 'asset' },
        { selector: 'video[poster]', attribute: 'poster', type: 'asset' },
        { selector: 'video[data-poster]', attribute: 'data-poster', type: 'asset' },
        { selector: 'audio[src]', attribute: 'src', type: 'asset' },
        { selector: 'audio source[src]', attribute: 'src', type: 'asset' },

        // Frames
        { selector: 'iframe[src]', attribute: 'src', type: 'page' },
        { selector: 'frame[src]', attribute: 'src', type: 'page' },

        // Objects and embeds
        { selector: 'object[data]', attribute: 'data', type: 'asset' },
        { selector: 'embed[src]', attribute: 'src', type: 'asset' },

        // Icons and favicons
        { selector: 'link[rel="icon"][href]', attribute: 'href', type: 'asset' },
        { selector: 'link[rel="shortcut icon"][href]', attribute: 'href', type: 'asset' },
        { selector: 'link[rel="apple-touch-icon"][href]', attribute: 'href', type: 'asset' },
        { selector: 'link[rel="apple-touch-icon-precomposed"][href]', attribute: 'href', type: 'asset' },
        { selector: 'link[rel="mask-icon"][href]', attribute: 'href', type: 'asset' },
        { selector: 'link[rel="manifest"][href]', attribute: 'href', type: 'asset' },

        // Open Graph / Social meta tags
        { selector: 'meta[property="og:image"][content]', attribute: 'content', type: 'asset' },
        { selector: 'meta[property="og:image:url"][content]', attribute: 'content', type: 'asset' },
        { selector: 'meta[property="og:image:secure_url"][content]', attribute: 'content', type: 'asset' },
        { selector: 'meta[property="og:video"][content]', attribute: 'content', type: 'asset' },
        { selector: 'meta[property="og:video:url"][content]', attribute: 'content', type: 'asset' },
        { selector: 'meta[property="og:audio"][content]', attribute: 'content', type: 'asset' },

        // Twitter Card meta tags
        { selector: 'meta[name="twitter:image"][content]', attribute: 'content', type: 'asset' },
        { selector: 'meta[name="twitter:image:src"][content]', attribute: 'content', type: 'asset' },
        { selector: 'meta[name="twitter:player:stream"][content]', attribute: 'content', type: 'asset' },

        // Schema.org / Microdata images
        { selector: 'meta[itemprop="image"][content]', attribute: 'content', type: 'asset' },
        { selector: '[itemprop="image"][src]', attribute: 'src', type: 'asset' },
        { selector: '[itemprop="thumbnailUrl"][content]', attribute: 'content', type: 'asset' },
        { selector: '[itemprop="contentUrl"][content]', attribute: 'content', type: 'asset' },
    ];

/**
 * Parse srcset attribute into individual URLs.
 */
function parseSrcset(srcset: string): string[] {
    const urls: string[] = [];
    const parts = srcset.split(',');

    for (const part of parts) {
        const trimmed = part.trim();
        const match = trimmed.match(/^(\S+)/);
        if (match?.[1]) {
            urls.push(match[1]);
        }
    }

    return urls;
}

/**
 * Extract inline style URLs from HTML elements.
 * Handles url(), image-set(), and -webkit-image-set().
 */
function extractInlineStyleUrls($: cheerio.CheerioAPI, baseUrl: string): ExtractedLink[] {
    const links: ExtractedLink[] = [];
    const urlPattern = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
    const imageSetPattern = /(?:image-set|-webkit-image-set)\s*\([^)]+\)/gi;

    $('[style]').each((_, el) => {
        const style = $(el).attr('style');
        if (!style) return;

        // Extract url() references
        let match;
        while ((match = urlPattern.exec(style)) !== null) {
            const url = match[1];
            if (url && !shouldSkipUrl(url)) {
                const resolved = resolveUrl(url, baseUrl);
                if (resolved) {
                    links.push({
                        url: resolved,
                        type: 'asset',
                        tag: getTagName(el),
                        attribute: 'style',
                    });
                }
            }
        }

        // Extract image-set() references
        const imageSetMatches = style.match(imageSetPattern);
        if (imageSetMatches) {
            for (const imageSet of imageSetMatches) {
                const innerUrls = imageSet.match(/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi);
                if (innerUrls) {
                    for (const innerMatch of innerUrls) {
                        const url = innerMatch.replace(/url\s*\(\s*['"]?|['"]?\s*\)/gi, '');
                        if (url && !shouldSkipUrl(url)) {
                            const resolved = resolveUrl(url, baseUrl);
                            if (resolved) {
                                links.push({
                                    url: resolved,
                                    type: 'asset',
                                    tag: getTagName(el),
                                    attribute: 'style',
                                });
                            }
                        }
                    }
                }
            }
        }
    });

    return links;
}

/**
 * Extract URLs from inline <style> tags.
 * Handles url(), @import, image-set(), and -webkit-image-set().
 */
function extractStyleTagUrls($: cheerio.CheerioAPI, baseUrl: string): ExtractedLink[] {
    const links: ExtractedLink[] = [];
    const urlPattern = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
    const importPattern = /@import\s+(?:url\s*\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?/gi;
    const imageSetPattern = /(?:image-set|-webkit-image-set)\s*\([^)]+\)/gi;

    $('style').each((_, el) => {
        const css = $(el).text();
        if (!css) return;

        // Extract url() references
        let match;
        while ((match = urlPattern.exec(css)) !== null) {
            const url = match[1];
            if (url && !shouldSkipUrl(url)) {
                const resolved = resolveUrl(url, baseUrl);
                if (resolved) {
                    links.push({
                        url: resolved,
                        type: 'asset',
                        tag: 'style',
                        attribute: 'content',
                    });
                }
            }
        }

        // Extract @import references
        while ((match = importPattern.exec(css)) !== null) {
            const url = match[1];
            if (url && !shouldSkipUrl(url)) {
                const resolved = resolveUrl(url, baseUrl);
                if (resolved) {
                    links.push({
                        url: resolved,
                        type: 'asset',
                        tag: 'style',
                        attribute: '@import',
                    });
                }
            }
        }

        // Extract image-set() references
        const imageSetMatches = css.match(imageSetPattern);
        if (imageSetMatches) {
            for (const imageSet of imageSetMatches) {
                const innerUrls = imageSet.match(/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi);
                if (innerUrls) {
                    for (const innerMatch of innerUrls) {
                        const url = innerMatch.replace(/url\s*\(\s*['"]?|['"]?\s*\)/gi, '');
                        if (url && !shouldSkipUrl(url)) {
                            const resolved = resolveUrl(url, baseUrl);
                            if (resolved) {
                                links.push({
                                    url: resolved,
                                    type: 'asset',
                                    tag: 'style',
                                    attribute: 'image-set',
                                });
                            }
                        }
                    }
                }
            }
        }
    });

    return links;
}

/**
 * Extract image URLs from JSON-LD structured data.
 */
function extractJsonLdImages($: cheerio.CheerioAPI, baseUrl: string): ExtractedLink[] {
    const links: ExtractedLink[] = [];
    const imageProperties = ['image', 'logo', 'thumbnail', 'thumbnailUrl', 'photo', 'primaryImageOfPage', 'contentUrl'];

    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const content = $(el).text();
            if (!content) return;

            const data = JSON.parse(content);
            extractImagesFromObject(data, imageProperties, baseUrl, links);
        } catch {
            // Ignore JSON parse errors
        }
    });

    return links;
}

/**
 * Recursively extract images from a JSON object.
 */
function extractImagesFromObject(
    obj: unknown,
    imageProperties: string[],
    baseUrl: string,
    links: ExtractedLink[]
): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractImagesFromObject(item, imageProperties, baseUrl, links);
        }
        return;
    }

    const record = obj as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
        // Check if this is an image property
        if (imageProperties.includes(key)) {
            if (typeof value === 'string' && !shouldSkipUrl(value)) {
                const resolved = resolveUrl(value, baseUrl);
                if (resolved) {
                    links.push({
                        url: resolved,
                        type: 'asset',
                        tag: 'script',
                        attribute: `ld+json:${key}`,
                    });
                }
            } else if (Array.isArray(value)) {
                for (const item of value) {
                    if (typeof item === 'string' && !shouldSkipUrl(item)) {
                        const resolved = resolveUrl(item, baseUrl);
                        if (resolved) {
                            links.push({
                                url: resolved,
                                type: 'asset',
                                tag: 'script',
                                attribute: `ld+json:${key}`,
                            });
                        }
                    } else if (typeof item === 'object' && item !== null) {
                        // Handle ImageObject
                        const imgObj = item as Record<string, unknown>;
                        if (typeof imgObj.url === 'string' && !shouldSkipUrl(imgObj.url)) {
                            const resolved = resolveUrl(imgObj.url, baseUrl);
                            if (resolved) {
                                links.push({
                                    url: resolved,
                                    type: 'asset',
                                    tag: 'script',
                                    attribute: `ld+json:${key}`,
                                });
                            }
                        }
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                // Handle ImageObject directly
                const imgObj = value as Record<string, unknown>;
                if (typeof imgObj.url === 'string' && !shouldSkipUrl(imgObj.url)) {
                    const resolved = resolveUrl(imgObj.url, baseUrl);
                    if (resolved) {
                        links.push({
                            url: resolved,
                            type: 'asset',
                            tag: 'script',
                            attribute: `ld+json:${key}`,
                        });
                    }
                }
            }
        }

        // Recurse into nested objects
        if (typeof value === 'object' && value !== null) {
            extractImagesFromObject(value, imageProperties, baseUrl, links);
        }
    }
}

/**
 * Parse HTML content and extract all links and assets.
 */
export function parseHtml(html: string, pageUrl: string): HtmlParseResult {
    const $ = cheerio.load(html);
    const links: ExtractedLink[] = [];
    const seenUrls = new Set<string>();

    // Get base URL from <base> tag
    const baseHref = $('base[href]').attr('href');
    const baseUrl = baseHref ? resolveUrl(baseHref, pageUrl) || pageUrl : pageUrl;

    // Get page title
    const title = $('title').text().trim() || null;

    // Extract links using selectors
    for (const { selector, attribute, type } of LINK_SELECTORS) {
        $(selector).each((_, el) => {
            const value = $(el).attr(attribute);
            if (!value) return;

            // Handle srcset specially
            if (attribute === 'srcset') {
                const srcsetUrls = parseSrcset(value);
                for (const srcUrl of srcsetUrls) {
                    if (shouldSkipUrl(srcUrl)) continue;
                    const resolved = resolveUrl(srcUrl, baseUrl);
                    if (resolved && !seenUrls.has(resolved)) {
                        seenUrls.add(resolved);
                        links.push({
                            url: resolved,
                            type: 'asset',
                            tag: getTagName(el),
                            attribute,
                        });
                    }
                }
                return;
            }

            if (shouldSkipUrl(value)) return;

            const resolved = resolveUrl(value, baseUrl);
            if (!resolved) return;

            const normalized = normalizeUrl(resolved);
            if (!normalized || seenUrls.has(normalized)) return;

            seenUrls.add(normalized);
            links.push({
                url: resolved,
                type,
                tag: getTagName(el),
                attribute,
            });
        });
    }

    // Extract inline style URLs
    const inlineStyleLinks = extractInlineStyleUrls($, baseUrl);
    for (const link of inlineStyleLinks) {
        const normalized = normalizeUrl(link.url);
        if (normalized && !seenUrls.has(normalized)) {
            seenUrls.add(normalized);
            links.push(link);
        }
    }

    // Extract style tag URLs
    const styleTagLinks = extractStyleTagUrls($, baseUrl);
    for (const link of styleTagLinks) {
        const normalized = normalizeUrl(link.url);
        if (normalized && !seenUrls.has(normalized)) {
            seenUrls.add(normalized);
            links.push(link);
        }
    }

    // Extract JSON-LD structured data images
    const jsonLdLinks = extractJsonLdImages($, baseUrl);
    for (const link of jsonLdLinks) {
        const normalized = normalizeUrl(link.url);
        if (normalized && !seenUrls.has(normalized)) {
            seenUrls.add(normalized);
            links.push(link);
        }
    }

    return { links, baseUrl, title };
}

/**
 * Rewrite links in HTML to use local paths.
 */
export function rewriteHtmlLinks(
    html: string,
    urlToLocalPath: Map<string, string>,
    pageLocalPath: string
): string {
    const $ = cheerio.load(html);

    // Calculate relative path from page to root
    const pageDepth = pageLocalPath.split('/').length - 1;
    const toRoot = pageDepth > 0 ? '../'.repeat(pageDepth) : './';

    // Rewrite all link selectors
    for (const { selector, attribute } of LINK_SELECTORS) {
        $(selector).each((_, el) => {
            const value = $(el).attr(attribute);
            if (!value) return;

            // Handle srcset
            if (attribute === 'srcset') {
                const parts = value.split(',');
                const rewrittenParts: string[] = [];

                for (const part of parts) {
                    const trimmed = part.trim();
                    const match = trimmed.match(/^(\S+)(\s+.+)?$/);
                    if (match) {
                        const url = match[1];
                        const descriptor = match[2] || '';
                        const normalized = normalizeUrl(url!);
                        const localPath = normalized ? urlToLocalPath.get(normalized) : null;

                        if (localPath) {
                            rewrittenParts.push(toRoot + localPath + descriptor);
                        } else {
                            rewrittenParts.push(trimmed);
                        }
                    }
                }

                $(el).attr(attribute, rewrittenParts.join(', '));
                return;
            }

            if (shouldSkipUrl(value)) return;

            const normalized = normalizeUrl(value);
            if (!normalized) return;

            const localPath = urlToLocalPath.get(normalized);
            if (localPath) {
                $(el).attr(attribute, toRoot + localPath);
            }
        });
    }

    // Rewrite inline styles
    $('[style]').each((_, el) => {
        const style = $(el).attr('style');
        if (!style) return;

        const rewritten = rewriteCssUrls(style, urlToLocalPath, toRoot);
        $(el).attr('style', rewritten);
    });

    // Rewrite style tags
    $('style').each((_, el) => {
        const css = $(el).text();
        if (!css) return;

        const rewritten = rewriteCssUrls(css, urlToLocalPath, toRoot);
        $(el).text(rewritten);
    });

    return $.html();
}

/**
 * Helper to rewrite URLs in CSS content.
 */
function rewriteCssUrls(
    css: string,
    urlToLocalPath: Map<string, string>,
    toRoot: string
): string {
    return css.replace(
        /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi,
        (match, url) => {
            if (shouldSkipUrl(url)) return match;

            const normalized = normalizeUrl(url);
            if (!normalized) return match;

            const localPath = urlToLocalPath.get(normalized);
            if (localPath) {
                return `url('${toRoot}${localPath}')`;
            }

            return match;
        }
    );
}

export default {
    parseHtml,
    rewriteHtmlLinks,
};
