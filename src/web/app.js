/**
 * ReCURSE Web GUI - Enhanced with Analyze Mode
 */

const socket = io();

// DOM Elements
const elements = {
    startForm: document.getElementById('start-form'),
    analyzingPanel: document.getElementById('analyzing-panel'),
    selectorPanel: document.getElementById('selector-panel'),
    progressDashboard: document.getElementById('progress-dashboard'),
    completedSection: document.getElementById('completed-section'),

    startUrl: document.getElementById('start-url'),
    maxDepth: document.getElementById('max-depth'),
    depthValue: document.getElementById('depth-value'),
    maxPages: document.getElementById('max-pages'),
    infiniteDepth: document.getElementById('infinite-depth'),
    infinitePages: document.getElementById('infinite-pages'),
    delay: document.getElementById('delay'),
    timeout: document.getElementById('timeout'),
    sameDomain: document.getElementById('same-domain'),
    startBtn: document.getElementById('start-btn'),
    startBtnText: document.getElementById('start-btn-text'),

    // Analyzing
    analyzeFound: document.getElementById('analyze-found'),
    analyzeQueued: document.getElementById('analyze-queued'),
    analyzeCurrent: document.getElementById('analyze-current'),
    analyzeUrl: document.getElementById('analyze-url'),
    analyzeSize: document.getElementById('analyze-size'),
    stopAnalyzeBtn: document.getElementById('stop-analyze-btn'),

    // Selector
    totalFound: document.getElementById('total-found'),
    analyzeDuration: document.getElementById('analyze-duration'),
    selectedCount: document.getElementById('selected-count'),
    selectedSize: document.getElementById('selected-size'), // Will add to HTML later or ensure it exists
    pageTree: document.getElementById('page-tree'),
    selectAllBtn: document.getElementById('select-all-btn'),
    deselectAllBtn: document.getElementById('deselect-all-btn'),
    backBtn: document.getElementById('back-btn'),
    downloadSelectedBtn: document.getElementById('download-selected-btn'),

    // Progress
    crawlStatus: document.getElementById('crawl-status'),
    crawlUrl: document.getElementById('crawl-url'),
    pagesDiscovered: document.getElementById('pages-discovered'),
    pagesDownloaded: document.getElementById('pages-downloaded'),
    totalSize: document.getElementById('total-size'),
    currentDepth: document.getElementById('current-depth'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    currentUrlDisplay: document.getElementById('current-url-display'),
    stopBtn: document.getElementById('stop-btn'),

    // Complete
    finalPages: document.getElementById('final-pages'),
    finalAssets: document.getElementById('final-assets'),
    finalSize: document.getElementById('final-size'),
    finalDuration: document.getElementById('final-duration'),
    outputPath: document.getElementById('output-path'),
    newCrawl: document.getElementById('new-crawl')
};

// State
let discoveredPages = [];
let pageTree = null;

// Event Listeners
elements.maxDepth.addEventListener('input', () => {
    elements.depthValue.textContent = elements.maxDepth.value;
});

elements.infiniteDepth?.addEventListener('change', () => {
    elements.maxDepth.disabled = elements.infiniteDepth.checked;
    elements.depthValue.textContent = elements.infiniteDepth.checked ? '∞' : elements.maxDepth.value;
});

elements.infinitePages?.addEventListener('change', () => {
    elements.maxPages.disabled = elements.infinitePages.checked;
});

// Number input buttons with hold-to-increment
document.querySelectorAll('.num-btn').forEach(btn => {
    let holdInterval = null;
    let holdTimeout = null;

    const doAction = () => {
        const inputId = btn.dataset.target;
        const input = document.getElementById(inputId);
        const action = btn.dataset.action;
        let val = parseInt(input.value) || 0;

        if (action === 'inc') {
            if (input.max && val >= parseInt(input.max)) return;
            val++;
        } else {
            if (input.min && val <= parseInt(input.min)) return;
            val--;
        }

        input.value = val;
        input.dispatchEvent(new Event('input'));
    };

    const startHold = () => {
        doAction(); // Initial click
        holdTimeout = setTimeout(() => {
            holdInterval = setInterval(doAction, 80); // Fast increment
        }, 400); // Delay before repeat starts
    };

    const stopHold = () => {
        clearTimeout(holdTimeout);
        clearInterval(holdInterval);
        holdInterval = null;
        holdTimeout = null;
    };

    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('mouseup', stopHold);
    btn.addEventListener('mouseleave', stopHold);
    btn.addEventListener('touchstart', startHold);
    btn.addEventListener('touchend', stopHold);
});

// Mode selection updates button text
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
        const isAnalyze = radio.value === 'analyze' && radio.checked;
        elements.startBtnText.textContent = isAnalyze ? '🔍 Analyze Site' : '⚡ Start Archiving';
    });
});

elements.startBtn.addEventListener('click', handleStart);
elements.stopBtn?.addEventListener('click', stopCrawl);
elements.stopAnalyzeBtn?.addEventListener('click', stopCrawl);
elements.newCrawl?.addEventListener('click', () => showView('start'));
elements.backBtn?.addEventListener('click', () => showView('start'));
elements.selectAllBtn?.addEventListener('click', () => selectAll(true));
elements.deselectAllBtn?.addEventListener('click', () => selectAll(false));
elements.downloadSelectedBtn?.addEventListener('click', downloadSelected);

// Socket Events
socket.on('analyzing', (data) => {
    elements.analyzeFound.textContent = data.total;
    elements.analyzeQueued.textContent = data.queued;
    elements.analyzeCurrent.textContent = data.url;
    if (data.totalSize !== undefined) {
        elements.analyzeSize.textContent = formatBytes(data.totalSize);
    }
});

socket.on('analyze-complete', (data) => {
    discoveredPages = data.pages;
    pageTree = data.tree;
    elements.totalFound.textContent = data.total;
    elements.analyzeDuration.textContent = (data.duration / 1000).toFixed(1) + 's';
    renderPageTree(data.tree);

    // Initial size calculation
    updateSelectedCount(); // This will now verify size too

    showView('selector');
});

socket.on('analyze-failed', (data) => {
    alert('Analysis failed: ' + data.error);
    showView('start');
});

socket.on('progress', (data) => {
    const stats = data.stats;
    elements.pagesDiscovered.textContent = stats.pagesDiscovered || 0;
    elements.pagesDownloaded.textContent = stats.pagesDownloaded || 0;
    elements.currentUrlDisplay.textContent = stats.currentUrl || 'Waiting...';
    if (stats.totalBytes) {
        elements.totalSize.textContent = formatBytes(stats.totalBytes);
    }
    const progress = stats.pagesDiscovered > 0 ? (stats.pagesDownloaded / stats.pagesDiscovered) * 100 : 0;
    elements.progressFill.style.width = Math.min(progress, 100) + '%';
    elements.progressText.textContent = `${stats.pagesDownloaded} / ${stats.pagesDiscovered} pages`;
});

socket.on('complete', (data) => {
    elements.finalPages.textContent = data.pages;
    elements.finalAssets.textContent = data.assets;
    elements.finalSize.textContent = formatBytes(data.totalBytes);
    elements.finalDuration.textContent = (data.duration / 1000).toFixed(1) + 's';
    elements.outputPath.textContent = data.outputPath;
    showView('completed');
});

socket.on('failed', (data) => {
    alert('Archive failed: ' + data.error);
    showView('start');
});

socket.on('stopped', () => showView('start'));

// Functions
function normalizeUrl(url) {
    url = url.trim();
    if (!url) return '';
    if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
    return url;
}

async function handleStart() {
    const url = normalizeUrl(elements.startUrl.value);
    if (!url) { elements.startUrl.focus(); return; }

    try { new URL(url); } catch { alert('Please enter a valid URL'); return; }

    const mode = document.querySelector('input[name="mode"]:checked')?.value || 'quick';
    const options = {
        url,
        depth: elements.infiniteDepth?.checked ? 999999 : parseInt(elements.maxDepth.value),
        pages: elements.infinitePages?.checked ? 999999 : parseInt(elements.maxPages.value),
        delay: parseInt(elements.delay?.value) || 500,
        timeout: parseInt(elements.timeout?.value) || 30000,
        sameDomain: elements.sameDomain?.checked !== false,
        smartDiscovery: document.getElementById('smart-discovery')?.checked !== false,
        outputDir: document.getElementById('output-dir')?.value || './archives'
    };

    if (mode === 'analyze') {
        await startAnalyze(options);
    } else {
        await startArchive(options);
    }
}

async function startAnalyze(options) {
    try {
        elements.analyzeUrl.textContent = new URL(options.url).hostname;
    } catch { elements.analyzeUrl.textContent = options.url; }

    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
    });
    const result = await response.json();
    if (result.success) {
        showView('analyzing');
    } else {
        alert('Failed to start: ' + result.error);
    }
}

async function startArchive(options) {
    try {
        elements.crawlUrl.textContent = new URL(options.url).hostname;
    } catch { elements.crawlUrl.textContent = options.url; }

    const response = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
    });
    const result = await response.json();
    if (result.success) {
        showView('progress');
    } else {
        alert('Failed to start: ' + result.error);
    }
}

async function stopCrawl() {
    await fetch('/api/stop', { method: 'POST' });
}

async function downloadSelected() {
    const selectedUrls = discoveredPages.filter(p => p.selected).map(p => p.url);
    if (selectedUrls.length === 0) {
        alert('Please select at least one page');
        return;
    }

    const response = await fetch('/api/archive-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: selectedUrls })
    });
    const result = await response.json();
    if (result.success) {
        showView('progress');
    } else {
        alert('Failed to start: ' + result.error);
    }
}

function renderPageTree(tree) {
    elements.pageTree.innerHTML = renderTreeNode(tree, 0);

    // Add event listeners
    elements.pageTree.querySelectorAll('.tree-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const path = e.target.dataset.path;
            const checked = e.target.checked;
            toggleNodeSelection(path, checked);
            updateSelectedCount();
        });
    });

    elements.pageTree.querySelectorAll('.tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const node = e.target.closest('.tree-node');
            const children = node.querySelector(':scope > .tree-children');
            if (children) {
                node.classList.toggle('collapsed');
                e.target.textContent = node.classList.contains('collapsed') ? '▶' : '▼';
            }
        });
    });
}

function renderTreeNode(node, depth) {
    const hasChildren = Object.keys(node.children).length > 0;
    const childrenHtml = hasChildren ? Object.values(node.children)
        .map(child => renderTreeNode(child, depth + 1)).join('') : '';

    return `
        <div class="tree-node">
            <div class="tree-item">
                ${hasChildren ? '<span class="tree-toggle">▼</span>' : '<span class="tree-toggle"></span>'}
                <input type="checkbox" class="tree-checkbox" data-path="${node.path}" checked>
                <span class="tree-name">${node.name}</span>
                <span class="tree-count">${node.count}</span>
            </div>
            ${hasChildren ? `<div class="tree-children">${childrenHtml}</div>` : ''}
        </div>
    `;
}

function toggleNodeSelection(path, selected) {
    // Toggle this node and all children
    discoveredPages.forEach(page => {
        if (page.path === path || page.path.startsWith(path + '/')) {
            page.selected = selected;
        }
    });

    // Update checkbox visuals
    elements.pageTree.querySelectorAll('.tree-checkbox').forEach(cb => {
        const cbPath = cb.dataset.path;
        if (cbPath === path || cbPath.startsWith(path + '/')) {
            cb.checked = selected;
        }
    });
}

function selectAll(selected) {
    discoveredPages.forEach(p => p.selected = selected);
    elements.pageTree.querySelectorAll('.tree-checkbox').forEach(cb => cb.checked = selected);
    updateSelectedCount();
}

function updateSelectedCount() {
    const selected = discoveredPages.filter(p => p.selected);
    const count = selected.length;

    // Calculate sizes (approx HTML size)
    const selectedBytes = selected.reduce((sum, p) => sum + (p.size || 0), 0);
    const totalBytes = discoveredPages.reduce((sum, p) => sum + (p.size || 0), 0);

    elements.selectedCount.textContent = count;

    // Update size display if element exists (create it dynamically if not)
    if (!elements.selectedSize) {
        const statsContainer = document.querySelector('.selector-stats');
        const sizeSpan = document.createElement('span');
        sizeSpan.id = 'selected-size';
        sizeSpan.className = 'size-stat';
        statsContainer.appendChild(sizeSpan);
        elements.selectedSize = sizeSpan;
    }

    elements.selectedSize.textContent = ` (${formatBytes(selectedBytes)} / ${formatBytes(totalBytes)})`;
}

function showView(view) {
    elements.startForm.classList.toggle('hidden', view !== 'start');
    elements.analyzingPanel?.classList.toggle('hidden', view !== 'analyzing');
    elements.selectorPanel?.classList.toggle('hidden', view !== 'selector');
    elements.progressDashboard.classList.toggle('hidden', view !== 'progress');
    elements.completedSection.classList.toggle('hidden', view !== 'completed');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
