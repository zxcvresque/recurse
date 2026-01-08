# ReCURSE - Website Archiver

A powerful Playwright-based website archiver with both CLI and Web GUI interfaces. Archive entire websites for offline use with smart discovery, real-time progress tracking, and selective page archiving.

---

## 🚀 Quick Start

### Web GUI (Recommended)
```bash
npm install
npm start
# Open http://localhost:3000 in your browser
```

### CLI
```bash
npm install
node src/cli.js https://example.com
```

---

## ✨ Features

### Core Capabilities
- **🔄 Recursive Crawling** - Configurable depth-based website traversal
- **🧠 Smart Discovery** - Automatic sitemap.xml and robots.txt parsing for efficient page discovery
- **📦 Asset Management** - Download and organize images, CSS, JavaScript, fonts, videos, and audio
- **🔗 Link Rewriting** - Automatic conversion of URLs to local paths for offline navigation
- **📊 Real-time Progress** - Live statistics and progress tracking via Socket.IO
- **💾 Flexible Export** - Output to folder structure or compressed ZIP archive
- **🎯 Selective Archiving** - Analyze first, then choose specific pages to archive
- **⚡ Rate Limiting** - Configurable delays to respect server resources
- **🖼️ Inline CSS** - Captures computed styles for pixel-perfect offline rendering
- **📸 Data URL Conversion** - Small images embedded as data URLs for faster loading

### Interface Options

#### 1. **Web GUI** (Feature-Rich)
- Modern, responsive interface with real-time updates
- Three-mode workflow:
  - **Quick Archive** - Direct archiving with customizable options
  - **Analyze Mode** - Discover pages without downloading (preview site structure)
  - **Selective Archive** - Choose specific pages from analysis results
- Visual progress tracking with live stats
- Hierarchical page tree view
- Size estimation before archiving
- Archive history management

#### 2. **CLI** (Automation-Friendly)
- Scriptable command-line interface
- Colored terminal output with progress spinners
- Ideal for automation and batch processing
- Detailed result statistics

---

## 📥 Installation

### Prerequisites
- **Node.js** 18 or higher
- **npm** (comes with Node.js)

### Setup
```bash
# Clone or download the repository
cd ReCURSE

# Install dependencies (includes Playwright browser)
npm install

# Playwright will automatically download Chromium (~170MB)
```

---

## 🎮 Usage

### Web GUI

```bash
# Start the server
npm start

# Or alternatively
npm run gui
```

Then open `http://localhost:3000` in your browser.

**Quick Archive Mode:**
1. Enter website URL
2. Configure options (depth, page limit, asset types)
3. Click "Start Archive"
4. Download completed archive from history

**Analyze & Select Mode:**
1. Enter website URL
2. Click "Analyze Site"
3. Browse discovered pages in tree view
4. Select specific pages to archive
5. Click "Archive Selected"

### CLI

```bash
# Basic usage
node src/cli.js <url> [options]

# Examples
node src/cli.js https://example.com
node src/cli.js https://blog.example.com -d 3 -p 100 -o myblog.zip
node src/cli.js https://docs.example.com --depth 2 --no-js --visible
```

#### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `-d, --depth <n>` | 3 | Maximum crawl depth (0 = single page) |
| `-p, --pages <n>` | 50 | Maximum pages to download |
| `-o, --output <path>` | ./archive | Output path (folder or .zip file) |
| `--delay <ms>` | 500 | Delay between page requests (ms) |
| `--timeout <ms>` | 30000 | Page load timeout (ms) |
| `--no-images` | false | Skip downloading images |
| `--no-css` | false | Skip downloading CSS files |
| `--no-js` | false | Skip downloading JavaScript |
| `--visible` | false | Show browser window (not headless) |

---

## 📂 Output Structure

### Folder Export
```
archive/
├── index.html              # Auto-redirect to main page
├── pages/                  # All archived HTML pages
│   ├── index.html
│   ├── about.html
│   ├── blog/
│   │   ├── post-1.html
│   │   └── post-2.html
│   └── docs/
│       └── guide.html
└── assets/
    ├── images/             # Image files
    ├── css/                # Stylesheets
    └── js/                 # JavaScript files
```

### ZIP Export
Same structure, compressed into a single `.zip` file for easy distribution.

---

## 🏆 Advantages

### vs HTTrack
- **Modern Browser Engine** - Uses Chromium via Playwright for accurate JavaScript rendering
- **Smart Discovery** - Automatic sitemap parsing for faster, more complete crawling
- **Selective Archiving** - Analyze first, then choose what to download
- **Real-time Feedback** - Live progress tracking in both CLI and GUI
- **Modern Stack** - Node.js/JavaScript ecosystem, easy to extend
- **Inline CSS Capture** - Captures computed styles for better offline fidelity
- **Web GUI** - User-friendly interface with visual page tree

### vs wget
- **JavaScript Support** - Full browser rendering, not just static HTML
- **Asset Organization** - Structured folder hierarchy instead of flat files
- **Link Rewriting** - Intelligent URL conversion for offline navigation
- **Progress Tracking** - Real-time stats and visual feedback
- **Selective Mode** - Preview and choose pages before downloading

### vs Browser Extensions
- **No Page Limits** - Archive thousands of pages automatically
- **Recursive Crawling** - Follow links across entire site structure
- **Automation Ready** - CLI interface for scripting and batch jobs
- **Server Deployment** - Run as a service for team access
- **Better Asset Handling** - Organized, deduplicated asset storage

### General Advantages
- **Cross-platform** - Works on Windows, macOS, Linux
- **Open Source** - MIT licensed, fully customizable
- **No Installation** - Just Node.js required, no complex setup
- **Lightweight** - Small codebase, minimal dependencies
- **Rate Limiting** - Built-in politeness to avoid server overload
- **URL Normalization** - Removes tracking parameters, deduplicates pages

---

## ⚠️ Limitations

### Technical Constraints
- **Same-Origin Policy** - Only crawls pages from the same domain by default
- **No Authentication** - Cannot bypass login pages or access protected content
- **JavaScript Execution** - May not capture dynamically loaded content that requires user interaction
- **External Resources** - Links to external domains remain as internet URLs
- **Binary Files** - Large files (videos, ISOs) are detected but not archived by default

### Performance Considerations
- **Large Sites** - Archiving thousands of pages can take significant time
- **Memory Usage** - Browser instances consume RAM (typically 200-500MB per session)
- **Storage** - Archives can be large depending on asset types included
- **Network** - Requires stable internet connection during archiving

### Content Limitations
- **Dynamic Content** - Infinite scroll, lazy loading may not be fully captured
- **Single Page Apps** - React/Vue apps with client-side routing may need special handling
- **Embedded Media** - YouTube videos, external widgets remain as external links
- **Forms & Interactivity** - Archived pages are static, forms won't submit
- **Relative Timestamps** - "Posted 2 hours ago" will show original timestamp

### Legal & Ethical
- **Copyright** - Respect website terms of service and copyright laws
- **Rate Limiting** - Default 500ms delay may still be too fast for some servers
- **Robots.txt** - Smart discovery respects sitemaps but doesn't enforce robots.txt crawl-delay
- **Server Load** - Aggressive crawling can impact server performance

---

## 🛠️ Advanced Configuration

### Environment Variables
```bash
PORT=3000  # Web server port (default: 3000)
```

### Programmatic Usage
```javascript
import { Archiver } from './src/archiver.js';

const archiver = new Archiver({
    startUrl: 'https://example.com',
    maxDepth: 3,
    maxPages: 100,
    outputPath: './my-archive.zip',
    includeAssets: {
        images: true,
        css: true,
        js: true
    },
    delay: 500,
    timeout: 30000,
    headless: true,
    smartDiscovery: true
});

archiver.on('page', (data) => {
    console.log(`Downloaded: ${data.url}`);
});

const result = await archiver.run();
console.log(`Archived ${result.pages} pages`);
```

---

## 📊 How It Works

### Crawling Process
1. **Initialization** - Launch headless Chromium browser
2. **Smart Discovery** (if enabled) - Parse robots.txt and sitemap.xml
3. **Queue Management** - Add starting URL and discovered URLs to queue
4. **Page Capture** - Navigate to each page, wait for DOM load
5. **Content Extraction** - Capture HTML, inline CSS, extract links
6. **Asset Download** - Fetch images, stylesheets, scripts
7. **Link Rewriting** - Convert absolute URLs to relative local paths
8. **Export** - Write to folder structure or ZIP archive

### Smart Discovery
- Checks `/robots.txt` for sitemap declarations
- Falls back to `/sitemap.xml` if not found
- Recursively processes sitemap indices
- Extracts all URLs before crawling begins
- Significantly faster for large, well-structured sites

### URL Normalization
- Removes tracking parameters (utm_*, fbclid, ref)
- Strips URL fragments (#anchors)
- Removes trailing slashes for consistency
- Deduplicates pages with different query strings

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Authentication support (session cookies, OAuth)
- Better SPA handling (wait for client-side routing)
- Incremental archiving (update existing archives)
- Compression options (quality settings)
- Custom crawl rules (CSS selectors, XPath)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🔗 Related Projects

- [Playwright](https://playwright.dev/) - Browser automation framework
- [HTTrack](https://www.httrack.com/) - Classic website copier
- [ArchiveBox](https://archivebox.io/) - Self-hosted internet archiving
- [SingleFile](https://github.com/gildas-lormeau/SingleFile) - Browser extension for single-page archiving

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on the project repository.
