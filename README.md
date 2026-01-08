<p align="center">
  <img src="recurse-logo.png" width="120" height="120" alt="Re/curse Logo">
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

---

## 📥 Installation

### Prerequisites
- **Node.js** 18 or higher
- **npm** (included with Node.js)

### Quick Start

```bash
git clone https://github.com/zxcvresque/recurse.git
cd recurse
npm install
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
│   └── blog/
│       └── post-1.html
└── assets/
    ├── images/
    ├── css/
    └── js/
```

---

## ⚠️ Limitations

- **JavaScript-heavy SPAs**: Dynamic content loaded after page render may not be fully captured
- **Infinite scroll**: Content requiring scroll to load is not automatically triggered
- **Login sessions**: Some sites with advanced bot detection may block archiving
- **Large files**: Very large assets (videos, PDFs) may slow down or fail
- **External domains**: Only same-origin content is archived by default
- **Forms & interactions**: Interactive elements won't function in archived pages
- **Streaming content**: Live streams and real-time content cannot be archived

---

## 📄 License

MIT License - See LICENSE file for details.
