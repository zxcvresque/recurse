/**
 * ReCURSE - Web Server
 * Express server with Socket.IO for real-time progress
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { Archiver } from './archiver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

// State
let currentArchiver = null;
let currentStats = { totalBytes: 0 };

// API Routes
app.post('/api/start', async (req, res) => {
    if (currentArchiver) {
        return res.status(400).json({ error: 'Archive already in progress' });
    }

    const {
        url, depth, pages,
        includeImages, includeCss, includeJs,
        includeFonts, includeVideo, includeAudio,
        delay, timeout, sameDomain, smartDiscovery
    } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        currentStats = { totalBytes: 0 };

        const outputDir = req.body.outputDir || './archives';
        // Generate intuitive filename from domain
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        const domain = urlObj.hostname.replace(/^www\./, '');
        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const filename = `${domain}_${date}.zip`;
        const outputPath = path.join(outputDir, filename);

        const config = {
            startUrl: url,
            maxDepth: parseInt(depth) || 3,
            maxPages: parseInt(pages) || 50,
            outputPath: outputPath,
            includeAssets: {
                images: includeImages !== false,
                css: includeCss !== false,
                js: includeJs !== false,
                fonts: includeFonts === true,
                video: includeVideo === true,
                audio: includeAudio === true
            },
            delay: parseInt(delay) || 500,
            timeout: parseInt(timeout) || 30000,
            sameDomain: sameDomain !== false,
            smartDiscovery: smartDiscovery !== false, // Default to true
            headless: true
        };

        currentArchiver = new Archiver(config);

        // Emit progress events with size
        currentArchiver.on('page', (data) => {
            currentStats.totalBytes = currentArchiver.stats?.totalBytes || 0;

            io.emit('progress', {
                state: 'running',
                stats: {
                    pagesDiscovered: data.discovered,
                    pagesDownloaded: data.downloaded,
                    currentUrl: data.url,
                    depth: data.depth,
                    totalBytes: currentStats.totalBytes
                }
            });
        });

        currentArchiver.on('error', (err) => {
            io.emit('error', { url: err.url, message: err.message });
        });

        res.json({ success: true, message: 'Archive started' });

        // Run archiver (runs in background)
        currentArchiver.run()
            .then(result => {
                io.emit('complete', {
                    pages: result.pages,
                    assets: result.assets,
                    totalBytes: result.totalBytes,
                    outputPath: result.outputPath,
                    duration: result.duration
                });
                currentArchiver = null;
            })
            .catch(err => {
                io.emit('failed', { error: err.message });
                currentArchiver = null;
            });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/stop', (req, res) => {
    if (currentArchiver) {
        if (typeof currentArchiver.stop === 'function') {
            currentArchiver.stop(); // Graceful stop
        } else {
            currentArchiver = null; // Force disconnect if no stop method
            io.emit('stopped', {});
        }
    }
    res.json({ success: true });
});

// Analyze mode - discover pages without downloading
app.post('/api/analyze', async (req, res) => {
    if (currentArchiver) {
        return res.status(400).json({ error: 'Operation already in progress' });
    }

    const { url, depth, pages, delay, timeout, sameDomain, smartDiscovery } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const config = {
            startUrl: url,
            maxDepth: parseInt(depth) || 3,
            maxPages: parseInt(pages) || 500,
            delay: parseInt(delay) || 200,
            timeout: parseInt(timeout) || 15000,
            sameDomain: sameDomain !== false,
            smartDiscovery: smartDiscovery !== false, // Default to true
            headless: true
        };
        // ... (rest of endpoint)


        currentArchiver = new Archiver(config);

        currentArchiver.on('analyzed', (data) => {
            io.emit('analyzing', {
                url: data.url,
                title: data.title,
                depth: data.depth,
                totalSize: data.totalSize,
                total: data.total,
                queued: data.queued
            });
        });

        currentArchiver.on('error', (err) => {
            io.emit('analyze-error', { url: err.url, message: err.message });
        });

        res.json({ success: true, message: 'Analysis started' });

        currentArchiver.analyze()
            .then(result => {
                io.emit('analyze-complete', {
                    pages: result.pages,
                    tree: result.tree,
                    total: result.total,
                    duration: result.duration
                });
                currentArchiver = null;
            })
            .catch(err => {
                io.emit('analyze-failed', { error: err.message });
                currentArchiver = null;
            });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Archive selected pages only
app.post('/api/archive-selected', async (req, res) => {
    if (currentArchiver) {
        return res.status(400).json({ error: 'Operation already in progress' });
    }

    const { urls, delay, timeout } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'URLs array is required' });
    }

    try {
        // Generate intuitive filename from domain
        const urlObj = new URL(urls[0].startsWith('http') ? urls[0] : `https://${urls[0]}`);
        const domain = urlObj.hostname.replace(/^www\./, '');
        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const filename = `${domain}_${date}.zip`;
        const outputPath = `./archives/${filename}`;

        const config = {
            startUrl: urls[0],
            maxDepth: 0,
            maxPages: urls.length,
            outputPath: outputPath,
            delay: parseInt(delay) || 500,
            timeout: parseInt(timeout) || 30000,
            headless: true
        };

        currentArchiver = new Archiver(config);

        currentArchiver.on('page', (data) => {
            io.emit('progress', {
                state: 'running',
                stats: {
                    pagesDiscovered: urls.length,
                    pagesDownloaded: data.downloaded,
                    currentUrl: data.url,
                    totalBytes: currentArchiver.stats?.totalBytes || 0
                }
            });
        });

        currentArchiver.on('error', (err) => {
            io.emit('error', { url: err.url, message: err.message });
        });

        res.json({ success: true, message: 'Archive started' });

        currentArchiver.runSelected(urls)
            .then(result => {
                io.emit('complete', {
                    pages: result.pages,
                    assets: result.assets,
                    totalBytes: result.totalBytes,
                    outputPath: result.outputPath,
                    duration: result.duration
                });
                currentArchiver = null;
            })
            .catch(err => {
                io.emit('failed', { error: err.message });
                currentArchiver = null;
            });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        running: currentArchiver !== null
    });
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('status', { running: currentArchiver !== null });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║     🔄 ReCURSE Website Archiver       ║
╚═══════════════════════════════════════╝

  Server running at: http://localhost:${PORT}
  
  Open this URL in your browser to use the GUI!
`);
});
