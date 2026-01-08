/**
 * ReCURSE - Manifest Generator
 * Generates JSON manifest and sitemap for archive
 */

/**
 * Generate a comprehensive manifest for the archive
 * @param {object} crawl - Crawl metadata
 * @param {array} pages - Array of page records
 * @param {array} assets - Array of asset records
 * @returns {object} - Manifest object
 */
export function generateManifest(crawl, pages, assets) {
    // Build page tree structure
    const pageTree = buildPageTree(pages);

    // Calculate statistics
    const stats = {
        totalPages: pages.length,
        totalAssets: assets.length,
        byDepth: countByDepth(pages),
        byAssetType: countByAssetType(assets),
        totalHtmlSize: pages.reduce((sum, p) => sum + (p.html?.length || 0), 0),
        totalAssetSize: assets.reduce((sum, a) => sum + (a.size || 0), 0)
    };

    return {
        version: '1.0.0',
        generator: 'ReCURSE Website Archiver',
        format: 'recurse-archive-v1',
        createdAt: new Date().toISOString(),

        source: {
            url: crawl?.startUrl,
            domain: getDomain(crawl?.startUrl),
            crawledAt: crawl?.startedAt ? new Date(crawl.startedAt).toISOString() : null,
            completedAt: crawl?.completedAt ? new Date(crawl.completedAt).toISOString() : null
        },

        options: {
            maxDepth: crawl?.options?.maxDepth,
            maxPages: crawl?.options?.maxPages,
            sameOriginOnly: crawl?.options?.sameOriginOnly
        },

        stats,

        pages: pages.map(page => ({
            id: page.id,
            url: page.url,
            title: page.title,
            path: getPagePath(page.url),
            depth: page.depth,
            links: page.links?.length || 0,
            assets: page.assets?.length || 0,
            size: page.html?.length || 0,
            timestamp: page.timestamp
        })),

        assets: assets.map(asset => ({
            hash: asset.hash,
            url: asset.url,
            path: getAssetPath(asset),
            type: asset.type,
            mimeType: asset.mimeType,
            size: asset.size
        })),

        tree: pageTree
    };
}

/**
 * Build hierarchical page tree by URL path
 */
function buildPageTree(pages) {
    const tree = { name: '/', children: {} };

    for (const page of pages) {
        try {
            const url = new URL(page.url);
            const parts = url.pathname.split('/').filter(Boolean);

            let node = tree;
            for (const part of parts) {
                if (!node.children[part]) {
                    node.children[part] = { name: part, children: {} };
                }
                node = node.children[part];
            }

            node.page = {
                url: page.url,
                title: page.title,
                depth: page.depth
            };
        } catch { }
    }

    return tree;
}

/**
 * Count pages by depth level
 */
function countByDepth(pages) {
    const counts = {};
    for (const page of pages) {
        const depth = page.depth ?? 0;
        counts[depth] = (counts[depth] || 0) + 1;
    }
    return counts;
}

/**
 * Count assets by type
 */
function countByAssetType(assets) {
    const counts = {};
    for (const asset of assets) {
        const type = asset.type || 'other';
        counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
}

/**
 * Get domain from URL
 */
function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
}

/**
 * Get local path for a page
 */
function getPagePath(url) {
    try {
        const u = new URL(url);
        let path = u.pathname;

        if (path === '/' || path === '') {
            return 'pages/index.html';
        }

        path = path.replace(/^\//, '');

        if (!path.endsWith('.html') && !path.includes('.')) {
            path = path.replace(/\/?$/, '/index.html');
        }

        return `pages/${path}`;
    } catch {
        return 'pages/page.html';
    }
}

/**
 * Get local path for an asset
 */
function getAssetPath(asset) {
    const folders = {
        image: 'images',
        css: 'css',
        js: 'js',
        font: 'fonts',
        media: 'media',
        other: 'other'
    };

    const folder = folders[asset.type] || 'other';
    const ext = getExtension(asset.url, asset.mimeType);
    const filename = (asset.hash || 'unknown').substring(0, 16) + ext;

    return `assets/${folder}/${filename}`;
}

/**
 * Get file extension from URL or MIME type
 */
function getExtension(url, mimeType) {
    try {
        const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
        if (match) return '.' + match[1].toLowerCase();
    } catch { }

    const mimeMap = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
        'text/css': '.css',
        'application/javascript': '.js',
        'text/javascript': '.js',
        'font/woff': '.woff',
        'font/woff2': '.woff2'
    };

    return mimeMap[mimeType] || '';
}
