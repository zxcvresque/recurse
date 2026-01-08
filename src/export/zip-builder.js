/**
 * ReCURSE - ZIP Builder
 * Generates downloadable ZIP archives from crawled content
 */

// JSZip is loaded as a global from lib/jszip.min.js in manifest
// In service worker context, we need to importScripts or use dynamic import
// For popup context, it's loaded via script tag

import { urlToPath, getAssetType } from '../utils/url-utils.js';

export class ZipBuilder {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Build a ZIP archive from crawled data
   * @param {string} crawlId - ID of the crawl to export
   * @param {object} options - Export options
   * @returns {Promise<Blob>} - ZIP file as Blob
   */
  async build(crawlId, options = {}) {
    const {
      includeManifest = true,
      includeSitemap = true,
      folderStructure = true
    } = options;

    const zip = new JSZip();

    // Get all pages and assets
    const pages = await this.storage.getAllPages(crawlId);
    const assets = await this.storage.getAllAssets(crawlId);
    const crawl = await this.storage.getCrawl(crawlId);

    if (!pages.length) {
      throw new Error('No pages to export');
    }

    console.log(`[ZipBuilder] Exporting ${pages.length} pages and ${assets.length} assets`);

    // Add pages
    const pageManifest = [];
    for (const page of pages) {
      const path = folderStructure
        ? `pages/${urlToPath(page.url)}`
        : urlToPath(page.url);

      // Ensure path ends with .html
      const finalPath = path.endsWith('.html') ? path : path + '.html';

      zip.file(finalPath, page.html);

      pageManifest.push({
        url: page.url,
        path: finalPath,
        title: page.title,
        depth: page.depth,
        timestamp: page.timestamp
      });
    }

    // Add assets
    const assetManifest = [];
    for (const asset of assets) {
      if (!asset.data) continue;

      const type = asset.type || getAssetType(asset.url);
      const ext = getExtensionFromMime(asset.mimeType, asset.url);
      const filename = `${asset.hash.substring(0, 16)}${ext}`;
      const folder = getAssetFolder(type);
      const path = `assets/${folder}/${filename}`;

      // Convert Blob to ArrayBuffer for JSZip
      let data = asset.data;
      if (data instanceof Blob) {
        data = await data.arrayBuffer();
      }

      zip.file(path, data);

      assetManifest.push({
        url: asset.url,
        path,
        type: asset.type,
        size: asset.size,
        hash: asset.hash
      });
    }

    // Generate index.html (entry point)
    const indexPage = pages.find(p => p.depth === 0) || pages[0];
    const indexPath = `pages/${urlToPath(indexPage.url)}`;
    zip.file('index.html', generateRedirectHtml(indexPath, indexPage.title));

    // Generate sitemap
    if (includeSitemap) {
      const sitemap = generateSitemap(pages, crawl);
      zip.file('sitemap.html', sitemap);
    }

    // Generate manifest
    if (includeManifest) {
      const manifest = {
        version: '1.0.0',
        generator: 'ReCURSE Website Archiver',
        createdAt: new Date().toISOString(),
        source: {
          url: crawl?.startUrl,
          crawledAt: crawl?.startedAt ? new Date(crawl.startedAt).toISOString() : null
        },
        stats: {
          pages: pages.length,
          assets: assets.length,
          totalSize: pages.reduce((sum, p) => sum + (p.html?.length || 0), 0) +
            assets.reduce((sum, a) => sum + (a.size || 0), 0)
        },
        pages: pageManifest,
        assets: assetManifest
      };

      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    }

    // Add README
    zip.file('README.txt', generateReadme(crawl, pages.length, assets.length));

    // Generate ZIP
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    console.log(`[ZipBuilder] Generated ZIP: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    return blob;
  }
}

function getAssetFolder(type) {
  const folders = {
    image: 'images',
    css: 'css',
    js: 'js',
    font: 'fonts',
    media: 'media',
    other: 'other'
  };
  return folders[type] || 'other';
}

function getExtensionFromMime(mimeType, url) {
  // Try from URL first
  const urlMatch = url?.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (urlMatch) {
    return '.' + urlMatch[1].toLowerCase();
  }

  // Fallback to MIME type
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'text/css': '.css',
    'application/javascript': '.js',
    'text/javascript': '.js',
    'font/woff': '.woff',
    'font/woff2': '.woff2',
    'application/font-woff': '.woff',
    'application/font-woff2': '.woff2',
    'font/ttf': '.ttf',
    'application/x-font-ttf': '.ttf',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg'
  };

  return mimeMap[mimeType] || '';
}

function generateRedirectHtml(targetPath, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${targetPath}">
  <title>${escapeHtml(title || 'Archive')}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #0f0f14;
      color: #f0f0f5;
    }
    a {
      color: #6366f1;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <p>Redirecting to <a href="${targetPath}">${escapeHtml(title || 'archive')}</a>...</p>
</body>
</html>`;
}

function generateSitemap(pages, crawl) {
  const sortedPages = [...pages].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.url.localeCompare(b.url);
  });

  const pageLinks = sortedPages.map(page => {
    const path = `pages/${urlToPath(page.url)}`;
    const indent = '  '.repeat(page.depth);
    return `      <li style="margin-left: ${page.depth * 20}px">
        <a href="${path}">${escapeHtml(page.title || page.url)}</a>
        <span class="url">${escapeHtml(page.url)}</span>
      </li>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sitemap - ${escapeHtml(crawl?.startUrl || 'Archive')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f14;
      color: #f0f0f5;
      padding: 40px;
      line-height: 1.6;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .meta {
      color: #606070;
      font-size: 14px;
      margin-bottom: 24px;
    }
    ul {
      list-style: none;
    }
    li {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    .url {
      display: block;
      font-size: 12px;
      color: #606070;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <h1>Site Archive</h1>
  <p class="meta">
    Source: ${escapeHtml(crawl?.startUrl || 'Unknown')}<br>
    Archived: ${new Date().toLocaleDateString()}<br>
    Pages: ${pages.length}
  </p>
  <ul>
${pageLinks}
  </ul>
</body>
</html>`;
}

function generateReadme(crawl, pageCount, assetCount) {
  return `ReCURSE Website Archive
=======================

Source URL: ${crawl?.startUrl || 'Unknown'}
Archived on: ${new Date().toISOString()}
Pages: ${pageCount}
Assets: ${assetCount}

How to Use
----------
1. Extract this ZIP archive to a folder
2. Open index.html in your web browser
3. Navigate the site offline using the preserved links

Files
-----
- index.html: Entry point (redirects to main page)
- sitemap.html: Overview of all archived pages
- manifest.json: Metadata and file inventory
- pages/: All archived HTML pages
- assets/: CSS, JavaScript, images, and other resources

Notes
-----
- External links will still point to the internet
- Some dynamic features may not work offline
- This archive was created with ReCURSE Website Archiver

License
-------
The content of this archive belongs to the original website owner.
This archive is for personal offline use only.
`;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
