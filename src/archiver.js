/**
 * ReCURSE - Main Archiver
 * Playwright-based website crawler and archiver
 */

import { chromium } from 'playwright';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import JSZip from 'jszip';

export class Archiver extends EventEmitter {
    constructor(config) {
        super();
        this.startUrl = config.startUrl;
        this.maxDepth = config.maxDepth ?? 3;
        this.maxPages = config.maxPages ?? 50;
        this.outputPath = config.outputPath ?? './archive';
        this.includeAssets = config.includeAssets ?? { images: true, css: true, js: true };
        this.delay = config.delay ?? 500;
        this.timeout = config.timeout ?? 30000;
        this.timeout = config.timeout ?? 30000;
        this.headless = config.headless ?? true;
        this.smartDiscovery = config.smartDiscovery ?? true;

        this.visited = new Set();
        this.queue = [];
        this.pages = [];
        this.assets = new Map();
        this.stats = { pages: 0, assets: 0, totalBytes: 0, errors: 0 };

        try {
            this.origin = new URL(this.startUrl).origin;
        } catch (e) {
            throw new Error(`Invalid URL: ${this.startUrl}`);
        }
    }

    async run() {
        const startTime = Date.now();

        // Launch browser
        this.browser = await chromium.launch({ headless: this.headless });
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ReCURSE/1.0 Website Archiver'
        });
        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(this.timeout);

        try {
            // Start crawling
            // Start crawling
            if (this.smartDiscovery) {
                this.emit('status', { message: 'Running Smart Discovery...' });
                const discovered = await this.discoverSitemaps();
                if (discovered.length > 0) {
                    this.emit('status', { message: `Smart Discovery found ${discovered.length} URLs` });
                    for (const url of discovered) {
                        const norm = this.normalizeUrl(url);
                        if (!this.visited.has(norm) && this.shouldCrawl(url)) {
                            this.queue.push({ url, depth: 1 });
                        }
                    }
                }
            }

            this.queue.push({ url: this.startUrl, depth: 0 });
            await this.processQueue();

            // Export archive
            const outputPath = await this.exportArchive();

            return {
                pages: this.stats.pages,
                assets: this.stats.assets,
                totalBytes: this.stats.totalBytes,
                outputPath,
                duration: Date.now() - startTime
            };
        } finally {
            await this.browser.close();
        }
    }

    // Analyze mode - discover pages without downloading content
    async analyze() {
        const startTime = Date.now();
        const discoveredPages = [];

        this.browser = await chromium.launch({ headless: this.headless });
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ReCURSE/1.0 Website Archiver'
        });
        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(this.timeout);

        try {
            if (this.smartDiscovery) {
                this.emit('analyzing', { title: 'Smart Discovery...', url: 'Checking robots.txt & sitemaps', depth: 0, total: 0, queued: 0 });
                const discovered = await this.discoverSitemaps();
                for (const url of discovered) {
                    const norm = this.normalizeUrl(url);
                    if (!this.visited.has(norm) && this.shouldCrawl(url)) {
                        this.queue.push({ url, depth: 1 });
                    }
                }
            }

            this.queue.push({ url: this.startUrl, depth: 0 });

            let totalDiscoveredBytes = 0;

            this.stopped = false;
            while (this.queue.length > 0 && discoveredPages.length < this.maxPages) {
                if (this.stopped) break;
                const { url, depth } = this.queue.shift();

                const normalized = this.normalizeUrl(url);
                if (this.visited.has(normalized)) continue;
                this.visited.add(normalized);

                try {
                    // Track size of all resources loaded by the browser (Passive)
                    let pageSize = 0;
                    const resourceListener = (response) => {
                        const length = response.headers()['content-length'];
                        if (length) {
                            pageSize += parseInt(length, 10);
                        }
                    };
                    this.page.on('response', resourceListener);

                    // Navigate
                    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

                    // Remove listener after navigation settles
                    this.page.removeListener('response', resourceListener);

                    const title = await this.page.title().catch(() => '');
                    const content = await this.page.content().catch(() => '');
                    // Add HTML size itself if not captured by network (though document request usually is)
                    if (pageSize === 0) pageSize = content.length;

                    totalDiscoveredBytes += pageSize;

                    // Extract links and check for binary files (Active HEAD)
                    const linkInfo = await this.page.evaluate(async () => {
                        const anchors = Array.from(document.querySelectorAll('a[href]'));
                        const links = [];
                        const binaryExts = ['.zip', '.exe', '.dmg', '.iso', '.mp4', '.mp3', '.pdf', '.msi'];

                        for (const a of anchors) {
                            const href = a.href;
                            if (!href.startsWith('http')) continue;

                            let size = 0;
                            const isBinary = binaryExts.some(ext => href.toLowerCase().endsWith(ext));

                            // Active check for binaries
                            if (isBinary) {
                                try {
                                    const response = await fetch(href, { method: 'HEAD' });
                                    const cl = response.headers.get('content-length');
                                    if (cl) size = parseInt(cl, 10);
                                } catch (e) { console.error('HEAD failed', href); }
                            }

                            links.push({ href, size });
                        }
                        return links;
                    });

                    // Add binary sizes to total
                    const binarySize = linkInfo.reduce((acc, l) => acc + (l.size || 0), 0);
                    totalDiscoveredBytes += binarySize;

                    // Update current page size with binaries
                    const finalPageSize = pageSize + binarySize;

                    // Parse URL into path segments
                    const urlObj = new URL(url);
                    const pathSegments = urlObj.pathname.split('/').filter(s => s);

                    discoveredPages.push({
                        url,
                        title,
                        depth,
                        size: finalPageSize,
                        path: urlObj.pathname,
                        pathSegments,
                        selected: true // Default selected
                    });

                    this.emit('analyzed', {
                        url,
                        depth,
                        title,
                        size: finalPageSize,
                        totalSize: totalDiscoveredBytes,
                        total: discoveredPages.length,
                        queued: this.queue.length
                    });

                    // Add links to queue
                    const links = linkInfo.map(l => l.href);



                    // Add links to queue
                    if (depth < this.maxDepth) {
                        for (const link of links) {
                            const normLink = this.normalizeUrl(link);
                            if (this.shouldCrawl(normLink)) {
                                this.queue.push({ url: link, depth: depth + 1 });
                            }
                        }
                    }

                    // Rate limiting
                    if (this.delay > 0) {
                        await new Promise(r => setTimeout(r, Math.min(this.delay, 200)));
                    }
                } catch (error) {
                    this.emit('error', { url, message: error.message });
                }
            }

            // Build tree structure from discovered pages
            const pageTree = this.buildPageTree(discoveredPages);

            return {
                pages: discoveredPages,
                tree: pageTree,
                total: discoveredPages.length,
                duration: Date.now() - startTime,
                stopped: this.stopped
            };
        } finally {
            await this.browser.close();
        }
    }

    stop() {
        this.stopped = true;
    }

    // Build hierarchical tree from flat page list
    buildPageTree(pages) {
        const tree = { name: '/', path: '/', children: {}, pages: [], count: 0, selected: true };

        for (const page of pages) {
            let current = tree;
            const segments = page.pathSegments;

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const fullPath = '/' + segments.slice(0, i + 1).join('/');

                if (!current.children[segment]) {
                    current.children[segment] = {
                        name: segment,
                        path: fullPath,
                        children: {},
                        pages: [],
                        count: 0,
                        selected: true
                    };
                }
                current = current.children[segment];
            }

            current.pages.push(page);
            current.count++;

            // Update ancestor counts
            let ancestor = tree;
            for (const seg of segments) {
                ancestor.count++;
                ancestor = ancestor.children[seg] || ancestor;
            }
        }

        // Add root pages (path = /)
        tree.pages = pages.filter(p => p.pathSegments.length === 0);
        tree.count = pages.length;

        return tree;
    }

    // Run archive on specific URLs only
    async runSelected(selectedUrls) {
        const startTime = Date.now();
        const urlSet = new Set(selectedUrls);

        this.browser = await chromium.launch({ headless: this.headless });
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ReCURSE/1.0 Website Archiver'
        });
        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(this.timeout);

        try {
            for (const url of selectedUrls) {
                try {
                    await this.capturePage(url, 0);
                    this.stats.pages++;
                    this.emit('page', {
                        url,
                        depth: 0,
                        discovered: selectedUrls.length,
                        downloaded: this.stats.pages
                    });

                    if (this.delay > 0) {
                        await new Promise(r => setTimeout(r, this.delay));
                    }
                } catch (error) {
                    this.stats.errors++;
                    this.emit('error', { url, message: error.message });
                }
            }

            const outputPath = await this.exportArchive();

            return {
                pages: this.stats.pages,
                assets: this.stats.assets,
                totalBytes: this.stats.totalBytes,
                outputPath,
                duration: Date.now() - startTime
            };
        } finally {
            await this.browser.close();
        }
    }

    async processQueue() {
        while (this.queue.length > 0 && this.stats.pages < this.maxPages) {
            const { url, depth } = this.queue.shift();

            const normalized = this.normalizeUrl(url);
            if (this.visited.has(normalized)) continue;
            this.visited.add(normalized);

            try {
                await this.capturePage(url, depth);
                this.stats.pages++;

                this.emit('page', {
                    url,
                    depth,
                    discovered: this.visited.size + this.queue.length,
                    downloaded: this.stats.pages
                });

                // Rate limiting
                if (this.delay > 0) {
                    await new Promise(r => setTimeout(r, this.delay));
                }
            } catch (error) {
                this.stats.errors++;
                this.emit('error', { url, message: error.message });
            }
        }
    }

    async capturePage(url, depth) {
        console.log(`  Capturing: ${url} (depth: ${depth})`);

        // Navigate to page
        await this.page.goto(url, { waitUntil: 'networkidle' });

        // Get page content
        const title = await this.page.title();

        // Capture page with inline CSS for perfect offline styling
        const html = await this.page.evaluate(() => {
            // Inline all CSS from stylesheets
            const cssTexts = [];
            for (const sheet of document.styleSheets) {
                try {
                    let css = '';
                    for (const rule of sheet.cssRules) {
                        css += rule.cssText + '\n';
                    }
                    cssTexts.push(css);
                } catch (e) {
                    // Cross-origin, try fetching
                    if (sheet.href) {
                        cssTexts.push(`/* External: ${sheet.href} */`);
                    }
                }
            }

            // Add inline style block with all captured CSS
            if (cssTexts.length > 0) {
                const styleEl = document.createElement('style');
                styleEl.id = 'recurse-inline-css';
                styleEl.textContent = cssTexts.join('\n');
                document.head.insertBefore(styleEl, document.head.firstChild);
            }

            // Remove stylesheet links (we have them inline now)
            document.querySelectorAll('link[rel="stylesheet"]').forEach(el => el.remove());

            // Convert small images to data URLs
            document.querySelectorAll('img').forEach(img => {
                if (img.complete && img.naturalWidth > 0 && img.naturalWidth < 500) {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        canvas.getContext('2d').drawImage(img, 0, 0);
                        const dataUrl = canvas.toDataURL('image/png');
                        if (dataUrl.length < 100000) { // Only if small enough
                            img.src = dataUrl;
                        }
                    } catch (e) { }
                }
            });

            return document.documentElement.outerHTML;
        });

        // Extract links for crawling
        const links = await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(href => href.startsWith('http'));
        });

        // Store page
        this.pages.push({
            url,
            normalizedUrl: this.normalizeUrl(url),
            depth,
            title,
            html,
            timestamp: Date.now()
        });
        this.stats.totalBytes += html.length;

        // Download assets
        if (this.includeAssets.images || this.includeAssets.css || this.includeAssets.js) {
            await this.downloadAssets(url);
        }

        // Add discovered links to queue
        if (depth < this.maxDepth) {
            for (const link of links) {
                const normalized = this.normalizeUrl(link);
                if (this.shouldCrawl(normalized)) {
                    this.queue.push({ url: link, depth: depth + 1 });
                }
            }
        }
    }

    async downloadAssets(pageUrl) {
        const assetUrls = await this.page.evaluate((config) => {
            const assets = [];

            if (config.images) {
                document.querySelectorAll('img[src]').forEach(img => {
                    if (img.src.startsWith('http')) assets.push({ url: img.src, type: 'image' });
                });
            }

            if (config.css) {
                document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                    if (link.href.startsWith('http')) assets.push({ url: link.href, type: 'css' });
                });
            }

            if (config.js) {
                document.querySelectorAll('script[src]').forEach(script => {
                    if (script.src.startsWith('http')) assets.push({ url: script.src, type: 'js' });
                });
            }

            return assets;
        }, this.includeAssets);

        for (const asset of assetUrls) {
            if (this.assets.has(asset.url)) continue;

            try {
                const response = await this.page.request.get(asset.url);
                if (response.ok()) {
                    const buffer = await response.body();
                    this.assets.set(asset.url, {
                        url: asset.url,
                        type: asset.type,
                        data: buffer,
                        size: buffer.length
                    });
                    this.stats.assets++;
                    this.stats.totalBytes += buffer.length;
                }
            } catch (e) {
                // Skip failed assets
            }
        }
    }

    async exportArchive() {
        // Determine if outputting to ZIP or folder
        const isZip = this.outputPath.endsWith('.zip');

        if (isZip) {
            return await this.exportAsZip();
        } else {
            return await this.exportAsFolder();
        }
    }

    async exportAsZip() {
        const zip = new JSZip();

        // Add pages
        for (const page of this.pages) {
            const pagePath = this.urlToPath(page.url);
            const rewrittenHtml = this.rewriteLinks(page.html, page.url);
            zip.file(`pages/${pagePath}`, rewrittenHtml);
        }

        // Add assets
        for (const [url, asset] of this.assets) {
            const assetPath = this.getAssetPath(url, asset.type);
            zip.file(assetPath, asset.data);
        }

        // Add index
        if (this.pages.length > 0) {
            const indexHtml = this.generateIndex();
            zip.file('index.html', indexHtml);
        }

        // Generate ZIP
        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        // Create parent directory if needed
        await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
        await fs.writeFile(this.outputPath, buffer);

        return this.outputPath;
    }

    async exportAsFolder() {
        await fs.mkdir(this.outputPath, { recursive: true });
        await fs.mkdir(path.join(this.outputPath, 'pages'), { recursive: true });
        await fs.mkdir(path.join(this.outputPath, 'assets', 'images'), { recursive: true });
        await fs.mkdir(path.join(this.outputPath, 'assets', 'css'), { recursive: true });
        await fs.mkdir(path.join(this.outputPath, 'assets', 'js'), { recursive: true });

        // Write pages
        for (const page of this.pages) {
            const pagePath = this.urlToPath(page.url);
            const rewrittenHtml = this.rewriteLinks(page.html, page.url);
            const fullPath = path.join(this.outputPath, 'pages', pagePath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, rewrittenHtml);
        }

        // Write assets
        for (const [url, asset] of this.assets) {
            const assetPath = this.getAssetPath(url, asset.type);
            const fullPath = path.join(this.outputPath, assetPath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, asset.data);
        }

        // Write index
        if (this.pages.length > 0) {
            const indexHtml = this.generateIndex();
            await fs.writeFile(path.join(this.outputPath, 'index.html'), indexHtml);
        }

        return this.outputPath;
    }

    rewriteLinks(html, pageUrl) {
        let result = html;

        // Rewrite asset URLs to local paths
        for (const [url, asset] of this.assets) {
            const localPath = '../' + this.getAssetPath(url, asset.type);
            result = result.split(url).join(localPath);
        }

        // Rewrite page links
        for (const page of this.pages) {
            const localPath = this.urlToPath(page.url);
            result = result.split(`href="${page.url}"`).join(`href="${localPath}"`);
        }

        return result;
    }

    generateIndex() {
        const mainPage = this.pages.find(p => p.depth === 0) || this.pages[0];
        const mainPath = `pages/${this.urlToPath(mainPage.url)}`;

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${mainPath}">
  <title>${mainPage.title || 'Archive'}</title>
  <style>
    body { font-family: system-ui; background: #0f0f14; color: #f0f0f5; 
           display: flex; align-items: center; justify-content: center; 
           min-height: 100vh; margin: 0; }
    a { color: #6366f1; }
  </style>
</head>
<body>
  <p>Redirecting to <a href="${mainPath}">${mainPage.title || 'archive'}</a>...</p>
</body>
</html>`;
    }

    urlToPath(url) {
        try {
            const u = new URL(url);
            let p = u.pathname;
            if (p === '/' || p === '') return 'index.html';
            p = p.replace(/^\//, '').replace(/\/$/, '');
            if (!p.includes('.') || p.endsWith('/')) p += '.html';
            return p.replace(/[<>:"|?*]/g, '_');
        } catch {
            return 'page.html';
        }
    }

    getAssetPath(url, type) {
        try {
            const u = new URL(url);
            const filename = path.basename(u.pathname) || 'asset';
            const folders = { image: 'images', css: 'css', js: 'js' };
            return `assets/${folders[type] || 'other'}/${filename}`;
        } catch {
            return `assets/other/asset`;
        }
    }

    normalizeUrl(url) {
        try {
            const u = new URL(url);
            ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid'].forEach(p => u.searchParams.delete(p));
            u.hash = '';
            let normalized = u.href;
            if (u.pathname !== '/' && normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            return normalized;
        } catch {
            return url;
        }
    }

    shouldCrawl(url) {
        if (this.visited.has(url)) return false;
        if (this.queue.some(q => this.normalizeUrl(q.url) === url)) return false;

        try {
            const u = new URL(url);
            // Same origin only
            if (u.origin !== this.origin) return false;
            // Skip non-page URLs
            const skipExt = ['.pdf', '.zip', '.exe', '.jpg', '.png', '.gif', '.mp4', '.mp3'];
            if (skipExt.some(ext => u.pathname.toLowerCase().endsWith(ext))) return false;
            return true;
        } catch {
            return false;
        }
    }

    // Smart Discovery: Robots.txt & Sitemaps
    async discoverSitemaps() {
        const discoveredUrls = new Set();
        const sitemapsToCheck = new Set();

        // 1. Check robots.txt
        try {
            const robotsUrl = new URL('/robots.txt', this.startUrl).href;
            const content = await this.fetchText(robotsUrl);
            if (content) {
                const lines = content.split('\n');
                for (const line of lines) {
                    const match = line.match(/^Sitemap:\s*(.+)$/i);
                    if (match) {
                        sitemapsToCheck.add(match[1].trim());
                    }
                }
            }
        } catch (e) {
            // Ignore robots.txt errors
        }

        // 2. Check standard sitemap.xml location if none found
        if (sitemapsToCheck.size === 0) {
            sitemapsToCheck.add(new URL('/sitemap.xml', this.startUrl).href);
        }

        // 3. Process sitemaps (recursive for indices)
        const processedSitemaps = new Set();

        const processSitemap = async (url) => {
            if (processedSitemaps.has(url)) return;
            processedSitemaps.add(url);

            try {
                this.emit('sitemap-processing', { url });
                const urls = await this.fetchSitemap(url);

                for (const item of urls) {
                    if (item.type === 'sitemap') {
                        await processSitemap(item.url);
                    } else {
                        discoveredUrls.add(item.url);
                    }
                }
            } catch (e) {
                // Ignore failed sitemaps
            }
        };

        for (const sitemapUrl of sitemapsToCheck) {
            await processSitemap(sitemapUrl);
        }

        return Array.from(discoveredUrls);
    }

    async fetchText(url) {
        try {
            const response = await this.page.request.get(url);
            if (response.ok()) {
                return await response.text();
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    async fetchSitemap(url) {
        // Use browser context to fetch and parse XML
        try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            return await this.page.evaluate(() => {
                const items = [];
                // Check for sitemap index
                const sitemaps = document.querySelectorAll('sitemaploc, sitemap loc');
                if (sitemaps.length > 0) {
                    sitemaps.forEach(el => items.push({ type: 'sitemap', url: el.textContent.trim() }));
                    return items;
                }

                // Check for urlset
                const urls = document.querySelectorAll('url loc');
                urls.forEach(el => items.push({ type: 'url', url: el.textContent.trim() }));

                return items;
            });
        } catch (e) {
            return [];
        }
    }
}
