/**
 * Re/curse - URL Utilities
 * URL normalization, validation, and comparison functions
 */

/**
 * Normalize a URL by removing tracking parameters and fragments
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
export function normalizeUrl(url) {
    try {
        const u = new URL(url);

        // Remove tracking parameters
        const trackingParams = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'ref', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid',
            '_ga', '_gl', 'yclid', 'wickedid', 'affiliate'
        ];

        trackingParams.forEach(param => u.searchParams.delete(param));

        // Remove fragment
        u.hash = '';

        // Remove trailing slash (except for root)
        let normalized = u.href;
        if (u.pathname !== '/' && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }

        // Lowercase hostname
        normalized = normalized.replace(u.hostname, u.hostname.toLowerCase());

        return normalized;
    } catch {
        return url;
    }
}

/**
 * Check if two URLs have the same origin
 * @param {string} url - URL to check
 * @param {string} origin - Origin to compare against
 * @returns {boolean}
 */
export function isSameOrigin(url, origin) {
    try {
        const u = new URL(url);
        const o = new URL(origin);
        return u.origin.toLowerCase() === o.origin.toLowerCase();
    } catch {
        return false;
    }
}

/**
 * Check if URL is a valid crawlable page URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export function isValidPageUrl(url) {
    try {
        const u = new URL(url);

        // Must be HTTP(S)
        if (!['http:', 'https:'].includes(u.protocol)) {
            return false;
        }

        // Skip common non-page extensions
        const skipExtensions = [
            '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz',
            '.exe', '.dmg', '.pkg', '.deb', '.rpm',
            '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.wmv',
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
            '.woff', '.woff2', '.ttf', '.eot'
        ];

        const pathname = u.pathname.toLowerCase();
        for (const ext of skipExtensions) {
            if (pathname.endsWith(ext)) {
                return false;
            }
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Get the relative path from one URL to another
 * @param {string} from - Base URL
 * @param {string} to - Target URL
 * @returns {string} - Relative path
 */
export function getRelativePath(from, to) {
    try {
        const fromUrl = new URL(from);
        const toUrl = new URL(to);

        // Different origins: return absolute URL
        if (fromUrl.origin !== toUrl.origin) {
            return to;
        }

        const fromParts = fromUrl.pathname.split('/').filter(Boolean);
        const toParts = toUrl.pathname.split('/').filter(Boolean);

        // Find common path prefix
        let commonLength = 0;
        while (
            commonLength < fromParts.length - 1 &&
            commonLength < toParts.length &&
            fromParts[commonLength] === toParts[commonLength]
        ) {
            commonLength++;
        }

        // Build relative path
        const upCount = fromParts.length - commonLength - 1;
        const relativeParts = [
            ...Array(upCount).fill('..'),
            ...toParts.slice(commonLength)
        ];

        let relativePath = relativeParts.join('/') || '.';

        // Add query and hash
        if (toUrl.search) relativePath += toUrl.search;
        if (toUrl.hash) relativePath += toUrl.hash;

        return relativePath;
    } catch {
        return to;
    }
}

/**
 * Convert URL to a safe filename
 * @param {string} url - URL to convert
 * @returns {string} - Safe filename
 */
export function urlToFilename(url) {
    try {
        const u = new URL(url);
        let path = u.pathname;

        // Handle root
        if (path === '/' || path === '') {
            return 'index.html';
        }

        // Remove leading slash
        path = path.replace(/^\//, '');

        // Replace path separators with allowed chars
        path = path.replace(/\//g, '__');

        // Add .html if no extension
        if (!path.includes('.') || path.endsWith('/')) {
            path = path.replace(/\/$/, '') + '.html';
        }

        // Sanitize characters
        path = path.replace(/[<>:"|?*]/g, '_');

        return path;
    } catch {
        return 'page.html';
    }
}

/**
 * Convert URL to folder structure path
 * @param {string} url - URL to convert
 * @returns {string} - Folder path
 */
export function urlToPath(url) {
    try {
        const u = new URL(url);
        let path = u.pathname;

        // Handle root
        if (path === '/' || path === '') {
            return 'index.html';
        }

        // Remove leading slash
        path = path.replace(/^\//, '');

        // Add index.html for directory paths
        if (path.endsWith('/') || !path.split('/').pop().includes('.')) {
            path = path.replace(/\/?$/, '/index.html');
        }

        return path;
    } catch {
        return 'page.html';
    }
}

/**
 * Get asset type from URL
 * @param {string} url - Asset URL
 * @returns {string} - Asset type
 */
export function getAssetType(url) {
    try {
        const pathname = new URL(url).pathname.toLowerCase();

        if (/\.(jpg|jpeg|png|gif|webp|avif|svg|ico|bmp)$/.test(pathname)) {
            return 'image';
        }
        if (/\.(css)$/.test(pathname)) {
            return 'css';
        }
        if (/\.(js|mjs)$/.test(pathname)) {
            return 'js';
        }
        if (/\.(woff2?|ttf|eot|otf)$/.test(pathname)) {
            return 'font';
        }
        if (/\.(mp4|webm|ogg|mp3|wav|m4a)$/.test(pathname)) {
            return 'media';
        }

        return 'other';
    } catch {
        return 'other';
    }
}
