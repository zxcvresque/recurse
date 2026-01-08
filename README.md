<p align="center">
  <img src="data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 50 L90 30 L90 70 L50 90 Z' fill='%230d9488'/%3E%3Cpath d='M50 50 L10 30 L10 70 L50 90 Z' fill='%2314b8a6'/%3E%3Cpath d='M50 50 L10 30 L50 10 L90 30 Z' fill='%235eead4'/%3E%3Cpath d='M50 40 L60 35 M50 40 L40 35 M50 40 L50 52' stroke='%23fff' stroke-width='3' stroke-linecap='round' fill='none'/%3E%3C/svg%3E" width="80" height="80" alt="Re/curse Logo">
</p>

<h1 align="center">Re/curse</h1>
<p align="center"><strong>Website Archiver</strong></p>
<p align="center">Archive entire websites for offline use with a modern GUI or CLI</p>


---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔄 **Recursive Crawling** | Configurable depth-based website traversal |
| 🧠 **Smart Discovery** | Automatic sitemap.xml and robots.txt parsing |
| 📦 **Asset Management** | Download images, CSS, JS, fonts, videos, audio |
| 🔗 **Link Rewriting** | Converts URLs to local paths for offline navigation |
| 🍪 **Cookie Import** | Paste exported cookies JSON to access login-protected pages |
| 🔐 **Interactive Login** | Manual login via visible browser (Brave/Chrome/Chromium) |
| 📊 **Real-time Progress** | Live statistics via Socket.IO |
| 💾 **Flexible Export** | Output to folder or ZIP archive |
| ⚡ **Fast Compression** | Optimized ZIP with low compression for speed |

---

## 📥 Installation

### Prerequisites
- **Node.js** 18 or higher
- **npm** (included with Node.js)

### Quick Start

```bash
# Clone repository
git clone https://github.com/zxcvresque/recurse.git
cd recurse

# Install dependencies
npm install

# Start the GUI
npm start
```

Then open **http://localhost:3000** in your browser.

---

## 🚀 Usage

### Web GUI (Recommended)

```bash
npm start
```

**Workflow:**
1. Enter the website URL
2. Choose **Quick Archive** or **Analyze First**
3. Configure depth, page limits, and asset options
4. Click **Start Archiving**
5. Download the archive from history

### CLI

```bash
node src/cli.js <url> [options]
```

**Examples:**
```bash
# Basic archive
node src/cli.js https://example.com

# Custom depth and output
node src/cli.js https://docs.example.com -d 5 -p 200 -o docs.zip

# With cookies for authenticated pages
node src/cli.js https://private.site.com --cookies cookies.json

# Skip JavaScript, show browser
node src/cli.js https://blog.example.com --no-js --visible
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `-d, --depth <n>` | 3 | Maximum crawl depth |
| `-p, --pages <n>` | 50 | Maximum pages to download |
| `-o, --output <path>` | ./archive | Output folder or .zip file |
| `-c, --cookies <file>` | - | Path to cookies JSON file |
| `--delay <ms>` | 500 | Delay between requests |
| `--timeout <ms>` | 30000 | Page load timeout |
| `--no-images` | - | Skip downloading images |
| `--no-css` | - | Skip downloading CSS |
| `--no-js` | - | Skip downloading JavaScript |
| `--visible` | - | Show browser window |

---

## 🔐 Authentication

### Method 1: Cookie Import (Headless)

1. Install a browser extension like **EditThisCookie**
2. Log into the target website
3. Export cookies as JSON
4. **CLI:** `node src/cli.js https://site.com --cookies cookies.json`
5. **GUI:** Paste JSON into "Import Cookies" in Advanced Options

### Method 2: Interactive Login (Visual)

1. Enable **Interactive Login** in Advanced Options
2. Select browser profile (Default/Chrome/Brave)
3. A visible browser window opens at the target URL
4. Log in manually (handle MFA, CAPTCHA, etc.)
5. Click **"I've Logged In"** in Re/curse to continue

---

## 📂 Output Structure

```
archive/
├── index.html          # Auto-redirect to main page
├── pages/              # All archived HTML pages
│   ├── index.html
│   ├── about.html
│   └── blog/
│       └── post-1.html
└── assets/
    ├── images/         # Image files
    ├── css/            # Stylesheets
    └── js/             # JavaScript files
```

---

## 🔧 Advanced Options

### Asset Selection
Choose which assets to include:
- ✅ Images (PNG, JPG, GIF, SVG)
- ✅ Stylesheets (CSS)
- ✅ JavaScript (JS)
- ✅ Fonts (WOFF, TTF, OTF)
- ✅ Videos (MP4, WEBM)
- ✅ Audio (MP3, WAV, OGG)

### Smart Discovery
Automatically finds pages via:
- `robots.txt` sitemap references
- `sitemap.xml` parsing
- Recursive link extraction

---

## 📄 License

MIT License - See LICENSE file for details.
