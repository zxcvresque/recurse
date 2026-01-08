// Utility Functions for DAMS Content Suite

// CSS Classes, UI Configuration, and Event Types are defined in utils/constants.js

// API Configuration (defined in index.html to avoid duplication)

// DOM Manipulation Helpers
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function createElement(tag, classes = '', content = '') {
  const element = document.createElement(tag);
  if (classes) element.className = classes;
  if (content) element.innerHTML = content;
  return element;
}

function showElement(element) {
  if (element) element.classList.remove(CSS_CLASSES.HIDDEN);
}

function hideElement(element) {
  if (element) element.classList.add(CSS_CLASSES.HIDDEN);
}

function toggleElement(element) {
  if (element) {
    element.classList.toggle(CSS_CLASSES.HIDDEN);
  }
}

// Event Handling Helpers
function addEventListeners(selectors, event, handler) {
  if (typeof selectors === 'string') {
    selectors = [selectors];
  }

  selectors.forEach(selector => {
    const elements = $$(selector);
    elements.forEach(element => {
      element.addEventListener(event, handler);
    });
  });
}

function removeEventListeners(selectors, event, handler) {
  if (typeof selectors === 'string') {
    selectors = [selectors];
  }

  selectors.forEach(selector => {
    const elements = $$(selector);
    elements.forEach(element => {
      element.removeEventListener(event, handler);
    });
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// String Helpers
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function truncate(str, length = 50, suffix = '...') {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-600/30 text-yellow-300">$1</mark>');
}

// URL and File Helpers
function getFileExtension(url) {
  if (!url) return '';
  try {
    const path = new URL(url).pathname;
    const extension = path.split('.').pop();
    return extension && extension.length <= 4 ? `.${extension}` : '.file';
  } catch (e) {
    return '.file';
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function getFileNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.substring(pathname.lastIndexOf('/') + 1);
  } catch (e) {
    return 'unknown-file';
  }
}

function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Date and Time Helpers
function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

function timeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return count === 1
        ? `1 ${interval.label} ago`
        : `${count} ${interval.label}s ago`;
    }
  }

  return 'Just now';
}

function isToday(date) {
  const today = new Date();
  const compareDate = new Date(date);
  return today.toDateString() === compareDate.toDateString();
}

function isThisWeek(date) {
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const compareDate = new Date(date);
  return compareDate >= weekStart;
}

// Array Helpers
function unique(array) {
  return [...new Set(array)];
}

function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
}

function sortBy(array, key, direction = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Object Helpers
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(deepClone);

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

function isEmpty(obj) {
  return obj === null || obj === undefined || Object.keys(obj).length === 0;
}

function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}

function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

// Validation Helpers
function isEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isPhone(phone) {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

function isValidPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

function validateForm(form) {
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  let isValid = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('error');
      isValid = false;
    } else {
      input.classList.remove('error');
    }
  });

  return isValid;
}

// Animation Helpers
function fadeIn(element, duration = 300) {
  element.style.opacity = '0';
  element.style.display = 'block';

  const start = performance.now();
  const animate = (currentTime) => {
    const elapsed = currentTime - start;
    const progress = elapsed / duration;

    if (progress < 1) {
      element.style.opacity = progress;
      requestAnimationFrame(animate);
    } else {
      element.style.opacity = '1';
    }
  };

  requestAnimationFrame(animate);
}

function fadeOut(element, duration = 300) {
  const start = performance.now();
  const startOpacity = parseFloat(getComputedStyle(element).opacity);

  const animate = (currentTime) => {
    const elapsed = currentTime - start;
    const progress = elapsed / duration;

    if (progress < 1) {
      element.style.opacity = startOpacity * (1 - progress);
      requestAnimationFrame(animate);
    } else {
      element.style.opacity = '0';
      element.style.display = 'none';
    }
  };

  requestAnimationFrame(animate);
}

function slideDown(element, duration = 300) {
  element.style.height = '0';
  element.style.overflow = 'hidden';
  element.style.display = 'block';

  const targetHeight = element.scrollHeight;
  const start = performance.now();

  const animate = (currentTime) => {
    const elapsed = currentTime - start;
    const progress = elapsed / duration;

    if (progress < 1) {
      element.style.height = `${targetHeight * progress}px`;
      requestAnimationFrame(animate);
    } else {
      element.style.height = 'auto';
    }
  };

  requestAnimationFrame(animate);
}

function slideUp(element, duration = 300) {
  const startHeight = element.scrollHeight;
  const start = performance.now();

  const animate = (currentTime) => {
    const elapsed = currentTime - start;
    const progress = elapsed / duration;

    if (progress < 1) {
      element.style.height = `${startHeight * (1 - progress)}px`;
      requestAnimationFrame(animate);
    } else {
      element.style.height = '0';
      element.style.display = 'none';
    }
  };

  requestAnimationFrame(animate);
}

// Local Storage Helpers
function setStorageItem(key, value) {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to read from localStorage:', error);
    return defaultValue;
  }
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
    return false;
  }
}

// Enhanced Cache System with Multiple Storage Layers
class CacheManager {
  static memoryCache = new Map();
  static persistentCache = new Map();
  static maxMemorySize = 100; // Increased from 50
  static maxPersistentSize = 500; // Increased from 200
  static memoryPressureThreshold = 0.8; // When to start cleanup
  static cleanupInterval = 300000; // 5 minutes
  static lastCleanup = Date.now();

  // Cache priorities
  static PRIORITIES = {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    CRITICAL: 4
  };

  // Cache storage types
  static STORAGE = {
    MEMORY: 'memory',
    PERSISTENT: 'persistent',
    SESSION: 'session'
  };

  // Initialize cache monitoring
  static init() {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryPressure();
      }, 60000); // Check every minute
    }

    // Periodic cleanup
    setInterval(() => {
      this.performMaintenance();
    }, this.cleanupInterval);
  }

  // Set cache item with priority and storage type
  static set(key, value, options = {}) {
    const {
      ttl = 3600000, // 1 hour default
      priority = this.PRIORITIES.NORMAL,
      storage = this.STORAGE.MEMORY,
      compress = false
    } = options;

    const cacheItem = {
      value: compress ? this.compress(value) : value,
      expiry: Date.now() + ttl,
      created: Date.now(),
      priority,
      storage,
      compressed: compress,
      size: this.getObjectSize(value)
    };

    // Clean up based on storage type
    this.cleanup(storage);

    // Store in appropriate cache
    switch (storage) {
      case this.STORAGE.MEMORY:
        this.memoryCache.set(key, cacheItem);
        break;
      case this.STORAGE.PERSISTENT:
        this.persistentCache.set(key, cacheItem);
        setStorageItem(`cache_${key}`, cacheItem);
        break;
      case this.STORAGE.SESSION:
        sessionStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
        break;
    }

    return true;
  }

  // Get cache item
  static get(key, storage = this.STORAGE.MEMORY) {
    let cacheItem = null;

    switch (storage) {
      case this.STORAGE.MEMORY:
        cacheItem = this.memoryCache.get(key);
        break;
      case this.STORAGE.PERSISTENT:
        cacheItem = this.persistentCache.get(key) || getStorageItem(`cache_${key}`);
        break;
      case this.STORAGE.SESSION:
        const sessionData = sessionStorage.getItem(`cache_${key}`);
        cacheItem = sessionData ? JSON.parse(sessionData) : null;
        break;
    }

    if (!cacheItem) return null;

    // Check expiry
    if (Date.now() > cacheItem.expiry) {
      this.delete(key, storage);
      return null;
    }

    // Return decompressed value if needed
    return cacheItem.compressed ? this.decompress(cacheItem.value) : cacheItem.value;
  }

  // Delete cache item
  static delete(key, storage = this.STORAGE.MEMORY) {
    switch (storage) {
      case this.STORAGE.MEMORY:
        return this.memoryCache.delete(key);
      case this.STORAGE.PERSISTENT:
        this.persistentCache.delete(key);
        removeStorageItem(`cache_${key}`);
        return true;
      case this.STORAGE.SESSION:
        sessionStorage.removeItem(`cache_${key}`);
        return true;
    }
    return false;
  }

  // Check if key exists in cache
  static has(key, storage = this.STORAGE.MEMORY) {
    const value = this.get(key, storage);
    return value !== null;
  }

  // Clear cache by storage type
  static clear(storage = null) {
    if (storage === null) {
      this.memoryCache.clear();
      this.persistentCache.clear();
      this.clearStorageCache();
      this.clearSessionCache();
    } else {
      switch (storage) {
        case this.STORAGE.MEMORY:
          this.memoryCache.clear();
          break;
        case this.STORAGE.PERSISTENT:
          this.persistentCache.clear();
          this.clearStorageCache();
          break;
        case this.STORAGE.SESSION:
          this.clearSessionCache();
          break;
      }
    }
  }

  // Get cache statistics
  static getStats() {
    return {
      memory: {
        size: this.memoryCache.size,
        maxSize: this.maxMemorySize
      },
      persistent: {
        size: this.persistentCache.size,
        maxSize: this.maxPersistentSize
      },
      storage: this.getStorageCacheSize(),
      session: this.getSessionCacheSize()
    };
  }

  // Cleanup cache based on size and priority
  static cleanup(storage) {
    switch (storage) {
      case this.STORAGE.MEMORY:
        if (this.memoryCache.size >= this.maxMemorySize) {
          this.evictLeastImportant(this.memoryCache, this.maxMemorySize * 0.7);
        }
        break;
      case this.STORAGE.PERSISTENT:
        if (this.persistentCache.size >= this.maxPersistentSize) {
          this.evictLeastImportant(this.persistentCache, this.maxPersistentSize * 0.7);
        }
        break;
    }
  }

  // Evict least important items
  static evictLeastImportant(cache, targetSize) {
    const items = Array.from(cache.entries());
    items.sort((a, b) => a[1].priority - b[1].priority);

    const itemsToRemove = items.slice(0, cache.size - Math.floor(targetSize));
    itemsToRemove.forEach(([key]) => cache.delete(key));
  }

  // Helper methods
  static clearStorageCache() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        removeStorageItem(key);
      }
    });
  }

  static clearSessionCache() {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  static getStorageCacheSize() {
    let size = 0;
    for (let key in localStorage) {
      if (key.startsWith('cache_')) {
        size += localStorage.getItem(key).length;
      }
    }
    return size;
  }

  static getSessionCacheSize() {
    let size = 0;
    for (let key in sessionStorage) {
      if (key.startsWith('cache_')) {
        size += sessionStorage.getItem(key).length;
      }
    }
    return size;
  }

  static getObjectSize(obj) {
    return new Blob([JSON.stringify(obj)]).size;
  }

  static compress(data) {
    // Simple compression for demo - in production use proper compression
    return btoa(JSON.stringify(data));
  }

  static decompress(data) {
    return JSON.parse(atob(data));
  }

  // Check memory pressure and cleanup if needed
  static checkMemoryPressure() {
    if ('memory' in performance) {
      const usedMemory = performance.memory.usedJSHeapSize;
      const totalMemory = performance.memory.jsHeapSizeLimit;
      const memoryUsage = usedMemory / totalMemory;

      if (memoryUsage > this.memoryPressureThreshold) {
        console.log(`Memory pressure detected: ${(memoryUsage * 100).toFixed(1)}%`);
        this.performAggressiveCleanup();
      }
    }
  }

  // Perform maintenance cleanup
  static performMaintenance() {
    const now = Date.now();

    // Clean up expired items
    this.cleanupExpiredItems();

    // Optimize cache sizes
    this.optimizeCacheSizes();

    // Update last cleanup time
    this.lastCleanup = now;

    console.log('Cache maintenance completed');
  }

  // Clean up expired items
  static cleanupExpiredItems() {
    const now = Date.now();

    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiry) {
        this.memoryCache.delete(key);
      }
    }

    // Clean persistent cache
    for (const [key, item] of this.persistentCache.entries()) {
      if (now > item.expiry) {
        this.persistentCache.delete(key);
        removeStorageItem(`cache_${key}`);
      }
    }

    // Clean session storage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const item = JSON.parse(sessionStorage.getItem(key));
          if (now > item.expiry) {
            sessionStorage.removeItem(key);
          }
        } catch (e) {
          // Remove corrupted items
          sessionStorage.removeItem(key);
        }
      }
    });
  }

  // Optimize cache sizes based on usage patterns
  static optimizeCacheSizes() {
    // If memory cache is too large, reduce it
    if (this.memoryCache.size > this.maxMemorySize) {
      this.evictLeastImportant(this.memoryCache, this.maxMemorySize * 0.7);
    }

    // If persistent cache is too large, reduce it
    if (this.persistentCache.size > this.maxPersistentSize) {
      this.evictLeastImportant(this.persistentCache, this.maxPersistentSize * 0.7);
    }
  }

  // Aggressive cleanup for memory pressure
  static performAggressiveCleanup() {
    console.log('Performing aggressive cache cleanup');

    // Clear low priority items first
    this.evictByPriority(this.memoryCache, this.PRIORITIES.LOW);
    this.evictByPriority(this.persistentCache, this.PRIORITIES.LOW);

    // If still under pressure, clear normal priority items
    if (this.isMemoryPressureHigh()) {
      this.evictByPriority(this.memoryCache, this.PRIORITIES.NORMAL);
      this.evictByPriority(this.persistentCache, this.PRIORITIES.NORMAL);
    }

    // Last resort: clear half of remaining items
    if (this.isMemoryPressureHigh()) {
      this.clearHalfCache(this.memoryCache);
      this.clearHalfCache(this.persistentCache);
    }
  }

  // Check if memory pressure is still high
  static isMemoryPressureHigh() {
    if ('memory' in performance) {
      const usedMemory = performance.memory.usedJSHeapSize;
      const totalMemory = performance.memory.jsHeapSizeLimit;
      return (usedMemory / totalMemory) > this.memoryPressureThreshold;
    }
    return false;
  }

  // Evict items by priority
  static evictByPriority(cache, maxPriority) {
    const itemsToRemove = Array.from(cache.entries())
      .filter(([, item]) => item.priority <= maxPriority)
      .map(([key]) => key);

    itemsToRemove.forEach(key => cache.delete(key));
  }

  // Clear half the cache
  static clearHalfCache(cache) {
    const items = Array.from(cache.entries());
    const half = Math.ceil(items.length / 2);
    const itemsToRemove = items.slice(0, half).map(([key]) => key);

    itemsToRemove.forEach(key => cache.delete(key));
  }

  // Get cache statistics with enhanced metrics
  static getDetailedStats() {
    const now = Date.now();
    const memoryStats = this.getCacheStats(this.memoryCache, now);
    const persistentStats = this.getCacheStats(this.persistentCache, now);

    return {
      memory: {
        ...memoryStats,
        size: this.memoryCache.size,
        maxSize: this.maxMemorySize,
        utilization: (this.memoryCache.size / this.maxMemorySize) * 100
      },
      persistent: {
        ...persistentStats,
        size: this.persistentCache.size,
        maxSize: this.maxPersistentSize,
        utilization: (this.persistentCache.size / this.maxPersistentSize) * 100
      },
      storage: this.getStorageCacheSize(),
      session: this.getSessionCacheSize(),
      lastCleanup: new Date(this.lastCleanup).toISOString(),
      memoryPressure: this.getMemoryPressure()
    };
  }

  // Get cache statistics for a specific cache
  static getCacheStats(cache, now) {
    const items = Array.from(cache.values());
    const expired = items.filter(item => now > item.expiry).length;
    const byPriority = items.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {});

    return {
      totalItems: items.length,
      expiredItems: expired,
      activeItems: items.length - expired,
      byPriority,
      averageSize: items.length > 0 ? items.reduce((sum, item) => sum + item.size, 0) / items.length : 0
    };
  }

  // Get current memory pressure
  static getMemoryPressure() {
    if ('memory' in performance) {
      const usedMemory = performance.memory.usedJSHeapSize;
      const totalMemory = performance.memory.jsHeapSizeLimit;
      return {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
        pressure: usedMemory / totalMemory > this.memoryPressureThreshold ? 'high' : 'normal'
      };
    }
    return { pressure: 'unknown' };
  }

  // Preload critical data
  static preloadCriticalData(dataMap) {
    Object.entries(dataMap).forEach(([key, data]) => {
      this.set(key, data, {
        priority: this.PRIORITIES.CRITICAL,
        storage: this.STORAGE.MEMORY,
        ttl: 3600000 // 1 hour
      });
    });
  }

  // Batch operations for better performance
  static batchSet(items) {
    const promises = items.map(({ key, value, options }) =>
      this.set(key, value, options)
    );
    return Promise.all(promises);
  }

  static batchGet(keys, storage = this.STORAGE.MEMORY) {
    return keys.map(key => this.get(key, storage));
  }

  // Smart caching with usage tracking
  static setWithTracking(key, value, options = {}) {
    const cacheItem = {
      value: options.compress ? this.compress(value) : value,
      expiry: Date.now() + (options.ttl || 3600000),
      created: Date.now(),
      priority: options.priority || this.PRIORITIES.NORMAL,
      storage: options.storage || this.STORAGE.MEMORY,
      compressed: options.compress || false,
      size: this.getObjectSize(value),
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Clean up based on storage type
    this.cleanup(options.storage || this.STORAGE.MEMORY);

    // Store in appropriate cache
    switch (cacheItem.storage) {
      case this.STORAGE.MEMORY:
        this.memoryCache.set(key, cacheItem);
        break;
      case this.STORAGE.PERSISTENT:
        this.persistentCache.set(key, cacheItem);
        setStorageItem(`cache_${key}`, cacheItem);
        break;
      case this.STORAGE.SESSION:
        sessionStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
        break;
    }

    return true;
  }

  // Enhanced get with usage tracking
  static getWithTracking(key, storage = this.STORAGE.MEMORY) {
    let cacheItem = null;

    switch (storage) {
      case this.STORAGE.MEMORY:
        cacheItem = this.memoryCache.get(key);
        break;
      case this.STORAGE.PERSISTENT:
        cacheItem = this.persistentCache.get(key) || getStorageItem(`cache_${key}`);
        break;
      case this.STORAGE.SESSION:
        const sessionData = sessionStorage.getItem(`cache_${key}`);
        cacheItem = sessionData ? JSON.parse(sessionData) : null;
        break;
    }

    if (!cacheItem) return null;

    // Check expiry
    if (Date.now() > cacheItem.expiry) {
      this.delete(key, storage);
      return null;
    }

    // Update access tracking
    cacheItem.accessCount = (cacheItem.accessCount || 0) + 1;
    cacheItem.lastAccessed = Date.now();

    // Update in storage if needed
    if (storage === this.STORAGE.PERSISTENT) {
      setStorageItem(`cache_${key}`, cacheItem);
    } else if (storage === this.STORAGE.SESSION) {
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    }

    // Return decompressed value if needed
    return cacheItem.compressed ? this.decompress(cacheItem.value) : cacheItem.value;
  }
}

// Legacy cache functions for backward compatibility
function setCacheItem(key, value, ttl = 3600000) {
  return CacheManager.set(key, value, { ttl, storage: CacheManager.STORAGE.PERSISTENT });
}

function getCacheItem(key) {
  return CacheManager.get(key, CacheManager.STORAGE.PERSISTENT);
}

function clearCache() {
  CacheManager.clear();
}

// Error Handling Helpers
function handleError(error, context = '') {
  console.error(`Error ${context}:`, error);

  // Log to external service in production
  if (window.location.hostname !== 'localhost') {
    // logErrorToService(error, context);
  }

  // Show user-friendly message
  const message = error.message || 'An unexpected error occurred';
  showNotification(message, 'error');

  // Trigger error event for analytics
  window.dispatchEvent(new CustomEvent(EVENT_TYPES.ERROR_OCCURRED, {
    detail: { error, context }
  }));
}

function showNotification(message, type = 'info', duration = 5000) {
  const notification = createElement('div', `notification notification-${type}`);
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white/70 hover:text-white">×</button>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, duration);
}

// Performance Helpers
function measurePerformance(name, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  console.log(`${name} took ${end - start} milliseconds`);
  return result;
}

function isMobile() {
  return window.innerWidth <= UI_CONFIG.MOBILE_BREAKPOINT;
}

function isTablet() {
  return window.innerWidth > UI_CONFIG.MOBILE_BREAKPOINT &&
         window.innerWidth <= UI_CONFIG.TABLET_BREAKPOINT;
}

function isDesktop() {
  return window.innerWidth > UI_CONFIG.TABLET_BREAKPOINT;
}

// Export all helper functions and constants
window.$ = $;
window.$$ = $$;
window.createElement = createElement;
window.showElement = showElement;
window.hideElement = hideElement;
window.toggleElement = toggleElement;
window.addEventListeners = addEventListeners;
window.removeEventListeners = removeEventListeners;
window.debounce = debounce;
window.throttle = throttle;
window.capitalize = capitalize;
window.truncate = truncate;
window.formatFileSize = formatFileSize;
window.formatDuration = formatDuration;
window.sanitizeHTML = sanitizeHTML;
window.highlightText = highlightText;
window.getFileExtension = getFileExtension;
window.isValidUrl = isValidUrl;
window.getFileNameFromUrl = getFileNameFromUrl;
window.downloadFile = downloadFile;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.isToday = isToday;
window.isThisWeek = isThisWeek;
window.unique = unique;
window.groupBy = groupBy;
window.sortBy = sortBy;
window.chunk = chunk;
window.deepClone = deepClone;
window.isEmpty = isEmpty;
window.pick = pick;
window.omit = omit;
window.isEmail = isEmail;
window.isPhone = isPhone;
window.isValidPassword = isValidPassword;
window.validateForm = validateForm;
window.fadeIn = fadeIn;
window.fadeOut = fadeOut;
window.slideDown = slideDown;
window.slideUp = slideUp;
window.setStorageItem = setStorageItem;
window.getStorageItem = getStorageItem;
window.removeStorageItem = removeStorageItem;
window.setCacheItem = setCacheItem;
window.getCacheItem = getCacheItem;
window.clearCache = clearCache;
window.handleError = handleError;
window.showNotification = showNotification;
window.measurePerformance = measurePerformance;
window.isMobile = isMobile;
window.isTablet = isTablet;
window.isDesktop = isDesktop;

// Export constants
window.CSS_CLASSES = CSS_CLASSES;
window.UI_CONFIG = UI_CONFIG;
window.EVENT_TYPES = EVENT_TYPES;
window.WORKER_URL = WORKER_URL;

// Enhanced Error Handling System
class ErrorHandler {
  static errorQueue = [];
  static maxQueueSize = 50;
  static retryAttempts = 3;
  static retryDelay = 1000;

  // Error types and their configurations
  static ERROR_TYPES = {
    NETWORK: {
      type: 'NETWORK',
      title: 'Connection Error',
      icon: '🔗',
      color: 'red',
      retryable: true
    },
    API: {
      type: 'API',
      title: 'API Error',
      icon: '⚡',
      color: 'orange',
      retryable: true
    },
    AUTH: {
      type: 'AUTH',
      title: 'Authentication Error',
      icon: '🔐',
      color: 'yellow',
      retryable: false
    },
    VALIDATION: {
      type: 'VALIDATION',
      title: 'Validation Error',
      icon: '✅',
      color: 'blue',
      retryable: false
    },
    PERMISSION: {
      type: 'PERMISSION',
      title: 'Permission Error',
      icon: '🚫',
      color: 'purple',
      retryable: false
    },
    SYSTEM: {
      type: 'SYSTEM',
      title: 'System Error',
      icon: '⚙️',
      color: 'gray',
      retryable: true
    }
  };

  // Log error with context
  static log(error, context = {}, userId = null) {
    const errorEntry = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message || error.toString(),
      stack: error.stack,
      type: context.type || 'UNKNOWN',
      context: context,
      userId: userId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      resolved: false
    };

    // Add to queue
    this.errorQueue.push(errorEntry);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest
    }

    // Log to console with enhanced formatting
    console.group(`🚨 ${errorEntry.type} Error: ${errorEntry.message}`);
    console.log('Context:', context);
    console.log('Timestamp:', errorEntry.timestamp);
    console.log('Error ID:', errorEntry.id);
    console.log('Stack:', error.stack);
    console.groupEnd();

    // Send to external logging service in production
    if (window.location.hostname !== 'localhost') {
      this.sendToLoggingService(errorEntry);
    }

    return errorEntry.id;
  }

  // Handle API errors with retry logic
  static async handleAPIError(error, retryFn, context = {}) {
    const errorId = this.log(error, { ...context, type: 'API' });

    if (context.retryable !== false && this.shouldRetry(error)) {
      return this.retryWithBackoff(retryFn, context.attempts || 0);
    }

    this.showErrorNotification({
      type: 'API',
      message: this.getErrorMessage(error),
      errorId: errorId,
      retryable: this.shouldRetry(error)
    });

    throw error;
  }

  // Handle network errors
  static handleNetworkError(error, context = {}) {
    const errorId = this.log(error, { ...context, type: 'NETWORK' });

    this.showErrorNotification({
      type: 'NETWORK',
      message: 'Connection failed. Please check your internet connection.',
      errorId: errorId,
      retryable: true
    });

    // Auto-retry for network errors
    if (context.autoRetry) {
      setTimeout(() => {
        if (context.retryFn) context.retryFn();
      }, this.retryDelay);
    }
  }

  // Handle authentication errors
  static handleAuthError(error, context = {}) {
    const errorId = this.log(error, { ...context, type: 'AUTH' });

    this.showErrorNotification({
      type: 'AUTH',
      message: 'Authentication failed. Please login again.',
      errorId: errorId,
      retryable: false
    });

    // Clear auth data and redirect to login
    removeStorageItem('token');
    removeStorageItem('user');
    window.location.reload();
  }

  // Show user-friendly error notification
  static showErrorNotification(errorInfo) {
    const notification = this.createNotificationElement(errorInfo);
    document.body.appendChild(notification);

    // Auto-remove after delay
    setTimeout(() => {
      this.removeNotification(notification);
    }, 8000);

    // Add click to dismiss
    notification.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    return notification;
  }

  // Create notification element
  static createNotificationElement(errorInfo) {
    const config = this.ERROR_TYPES[errorInfo.type] || this.ERROR_TYPES.SYSTEM;

    const notification = document.createElement('div');
    notification.className = `error-notification fixed top-4 right-4 z-50 max-w-sm w-full bg-${config.color}-900/90 border border-${config.color}-700/50 rounded-lg shadow-lg backdrop-blur-sm transform translate-x-full transition-transform duration-300`;
    notification.innerHTML = `
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <span class="text-2xl">${config.icon}</span>
          </div>
          <div class="ml-3 w-0 flex-1">
            <p class="text-sm font-medium text-${config.color}-100">
              ${config.title}
            </p>
            <p class="mt-1 text-sm text-${config.color}-200">
              ${errorInfo.message}
            </p>
            ${errorInfo.errorId ? `<p class="mt-1 text-xs text-${config.color}-300">ID: ${errorInfo.errorId}</p>` : ''}
            ${errorInfo.retryable ? `
              <div class="mt-3">
                <button class="retry-btn bg-${config.color}-700 hover:bg-${config.color}-600 text-white text-xs px-3 py-1 rounded transition-colors duration-200">
                  Retry
                </button>
              </div>
            ` : ''}
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button class="dismiss-btn text-${config.color}-400 hover:text-${config.color}-300 text-sm">
              ✕
            </button>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .error-notification {
        animation: slideInRight 0.3s ease-out forwards;
      }

      @keyframes slideInRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }

      .error-notification.removing {
        animation: slideOutRight 0.3s ease-in forwards;
      }

      @keyframes slideOutRight {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);

    // Add event listeners
    const dismissBtn = notification.querySelector('.dismiss-btn');
    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeNotification(notification);
    });

    const retryBtn = notification.querySelector('.retry-btn');
    if (retryBtn && errorInfo.retryFn) {
      retryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        errorInfo.retryFn();
        this.removeNotification(notification);
      });
    }

    return notification;
  }

  // Remove notification with animation
  static removeNotification(notification) {
    notification.classList.add('removing');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // Retry with exponential backoff
  static async retryWithBackoff(retryFn, attempt = 0) {
    try {
      return await retryFn();
    } catch (error) {
      if (attempt < this.retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.retryAttempts})`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(retryFn, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  // Determine if error should be retried
  static shouldRetry(error) {
    if (error.name === 'AbortError') return false; // User cancelled
    if (error.status === 401) return false; // Auth errors
    if (error.status === 403) return false; // Permission errors
    if (error.status >= 400 && error.status < 500) return false; // Client errors
    return true; // Network and server errors
  }

  // Get user-friendly error message
  static getErrorMessage(error) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.message) {
      return error.message;
    }

    if (error.status) {
      switch (error.status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Authentication required.';
        case 403: return 'Access denied.';
        case 404: return 'Resource not found.';
        case 429: return 'Too many requests. Please try again later.';
        case 500: return 'Server error. Please try again later.';
        case 503: return 'Service temporarily unavailable.';
        default: return `Error ${error.status}. Please try again.`;
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }

  // Generate unique error ID
  static generateErrorId() {
    return 'ERR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Send error to external logging service
  static async sendToLoggingService(errorEntry) {
    try {
      // This would typically send to services like Sentry, LogRocket, etc.
      // For demo purposes, we'll just store in localStorage
      const logs = getStorageItem('error_logs') || [];
      logs.push(errorEntry);
      setStorageItem('error_logs', logs.slice(-100)); // Keep last 100
    } catch (e) {
      console.error('Failed to send error to logging service:', e);
    }
  }

  // Get error statistics
  static getErrorStats() {
    const stats = {
      total: this.errorQueue.length,
      byType: {},
      recent: this.errorQueue.slice(-10)
    };

    this.errorQueue.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }

  // Clear error queue
  static clearErrors() {
    this.errorQueue = [];
  }

  // Export error logs
  static exportErrorLogs() {
    const logs = getStorageItem('error_logs') || [];
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  ErrorHandler.log(event.error, {
    type: 'JAVASCRIPT',
    filename: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.log(event.reason, {
    type: 'PROMISE',
    promise: event.promise
  });
});

// Export ErrorHandler
window.ErrorHandler = ErrorHandler;

// Lazy Loading System
class LazyLoader {
  static observer = null;
  static loadedElements = new Set();

  // Initialize intersection observer for lazy loading
  static init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadElement(entry.target);
            }
          });
        },
        {
          root: null,
          rootMargin: '50px',
          threshold: 0.1
        }
      );
    }
  }

  // Observe element for lazy loading
  static observe(element, loadFn) {
    if (!this.observer) this.init();

    element.dataset.lazyLoad = 'true';
    element.dataset.loadFn = loadFn;

    if (this.observer) {
      this.observer.observe(element);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadElement(element);
    }
  }

  // Load element content
  static loadElement(element) {
    if (this.loadedElements.has(element)) return;

    const loadFn = element.dataset.loadFn;
    if (loadFn && typeof window[loadFn] === 'function') {
      window[loadFn](element);
    }

    this.loadedElements.add(element);
    element.removeAttribute('data-lazy-load');
    element.removeAttribute('data-load-fn');

    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  // Lazy load images
  static lazyLoadImage(element) {
    const src = element.dataset.src;
    if (src) {
      const img = new Image();
      img.onload = () => {
        element.src = src;
        element.classList.remove('lazy-loading');
        element.classList.add('lazy-loaded');
      };
      img.onerror = () => {
        element.classList.remove('lazy-loading');
        element.classList.add('lazy-error');
      };
      element.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmc8L3RleHQ+PC9zdmc+';
      element.classList.add('lazy-loading');
    }
  }

  // Lazy load videos
  static lazyLoadVideo(element) {
    const src = element.dataset.src;
    if (src) {
      element.src = src;
      element.classList.remove('lazy-loading');
      element.classList.add('lazy-loaded');
    }
  }

  // Lazy load content
  static lazyLoadContent(element) {
    const content = element.dataset.content;
    if (content) {
      element.innerHTML = content;
      element.classList.remove('lazy-loading');
      element.classList.add('lazy-loaded');
    }
  }
}

// Performance Monitor
class PerformanceMonitor {
  static metrics = {
    pageLoadTime: 0,
    domReadyTime: 0,
    firstPaintTime: 0,
    firstContentfulPaintTime: 0,
    largestContentfulPaintTime: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0
  };

  static observers = [];

  // Initialize performance monitoring
  static init() {
    this.measurePageLoadTime();
    this.measureNavigationTiming();
    this.observeWebVitals();
    this.observeLayoutShifts();
    this.measureInteractionDelays();
  }

  // Measure page load time
  static measurePageLoadTime() {
    window.addEventListener('load', () => {
      this.metrics.pageLoadTime = performance.now();
      this.logMetric('pageLoadTime', this.metrics.pageLoadTime);
    });
  }

  // Measure navigation timing
  static measureNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.domReadyTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        this.logMetric('domReadyTime', this.metrics.domReadyTime);
      }
    }
  }

  // Observe Web Vitals
  static observeWebVitals() {
    // First Paint
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-paint') {
            this.metrics.firstPaintTime = entry.startTime;
            this.logMetric('firstPaintTime', this.metrics.firstPaintTime);
          } else if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaintTime = entry.startTime;
            this.logMetric('firstContentfulPaintTime', this.metrics.firstContentfulPaintTime);
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaintTime = lastEntry.startTime;
        this.logMetric('largestContentfulPaintTime', this.metrics.largestContentfulPaintTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    }
  }

  // Observe layout shifts
  static observeLayoutShifts() {
    if ('PerformanceObserver' in window) {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cumulativeLayoutShift = clsValue;
        this.logMetric('cumulativeLayoutShift', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    }
  }

  // Measure interaction delays
  static measureInteractionDelays() {
    if ('PerformanceObserver' in window) {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
          this.logMetric('firstInputDelay', this.metrics.firstInputDelay);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    }
  }

  // Log performance metric
  static logMetric(name, value) {
    console.log(`📊 Performance: ${name} = ${value.toFixed(2)}ms`);

    // Send to analytics service in production
    if (window.location.hostname !== 'localhost') {
      // analytics.track('performance', { name, value });
    }
  }

  // Get performance report
  static getReport() {
    const report = { ...this.metrics };

    // Add memory information if available
    if ('memory' in performance) {
      report.memoryUsage = performance.memory.usedJSHeapSize;
      report.memoryLimit = performance.memory.jsHeapSizeLimit;
      report.memoryPercent = (report.memoryUsage / report.memoryLimit) * 100;
    }

    return report;
  }

  // Export performance data
  static exportData() {
    const data = {
      metrics: this.getReport(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Cleanup observers
  static cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Service Worker Manager
class ServiceWorkerManager {
  static sw = null;
  static registration = null;

  // Register service worker
  static async register() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        this.sw = this.registration.active;

        console.log('Service Worker registered successfully');

        // Handle updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });

        return true;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
      }
    }
    return false;
  }

  // Show update notification
  static showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification fixed bottom-4 right-4 z-50 bg-blue-900/90 border border-blue-700/50 rounded-lg shadow-lg backdrop-blur-sm p-4 max-w-sm';
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <span class="text-2xl">🔄</span>
        </div>
        <div class="ml-3 w-0 flex-1">
          <p class="text-sm font-medium text-blue-100">
            App Update Available
          </p>
          <p class="mt-1 text-sm text-blue-200">
            A new version is ready to install.
          </p>
          <div class="mt-3">
            <button class="update-btn bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded transition-colors duration-200">
              Update Now
            </button>
            <button class="dismiss-update-btn text-blue-400 hover:text-blue-300 text-xs ml-2">
              Later
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Add event listeners
    const updateBtn = notification.querySelector('.update-btn');
    const dismissBtn = notification.querySelector('.dismiss-update-btn');

    updateBtn.addEventListener('click', () => {
      this.updateApp();
      notification.remove();
    });

    dismissBtn.addEventListener('click', () => {
      notification.remove();
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  // Update app
  static updateApp() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ action: 'skipWaiting' });
      window.location.reload();
    }
  }

  // Cache resources
  static async cacheResources(resources) {
    if (!this.registration) return false;

    try {
      const cache = await caches.open('dams-v1');
      await cache.addAll(resources);
      console.log('Resources cached successfully');
      return true;
    } catch (error) {
      console.error('Failed to cache resources:', error);
      return false;
    }
  }

  // Clear cache
  static async clearCache() {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Cache cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }
}

// Initialize performance monitoring
PerformanceMonitor.init();

// Export new utilities
window.CacheManager = CacheManager;
window.LazyLoader = LazyLoader;
window.PerformanceMonitor = PerformanceMonitor;
window.ServiceWorkerManager = ServiceWorkerManager;

// User Experience Enhancements
class UserExperienceManager {
  static progressData = new Map();
  static bookmarks = new Map();
  static userPreferences = {};

  // Progress Tracking System
  static ProgressTracker = class {
    static updateProgress(contentId, progress, metadata = {}) {
      const progressData = {
        contentId,
        progress: Math.min(Math.max(progress, 0), 100), // Clamp between 0-100
        lastUpdated: Date.now(),
        metadata,
        completed: progress >= 95 // Consider complete if 95% or more
      };

      // Store in memory
      UserExperienceManager.progressData.set(contentId, progressData);

      // Store in localStorage for persistence
      const allProgress = UserExperienceManager.getAllProgress();
      allProgress[contentId] = progressData;
      setStorageItem('user_progress', allProgress);

      // Trigger progress event
      window.dispatchEvent(new CustomEvent('progressUpdated', {
        detail: { contentId, progress: progressData }
      }));

      return progressData;
    }

    static getProgress(contentId) {
      return UserExperienceManager.progressData.get(contentId) ||
             UserExperienceManager.getAllProgress()[contentId];
    }

    static getAllProgress() {
      return getStorageItem('user_progress', {});
    }

    static removeProgress(contentId) {
      UserExperienceManager.progressData.delete(contentId);
      const allProgress = UserExperienceManager.getAllProgress();
      delete allProgress[contentId];
      setStorageItem('user_progress', allProgress);
    }

    static getProgressSummary() {
      const allProgress = this.getAllProgress();
      const totalItems = Object.keys(allProgress).length;
      const completedItems = Object.values(allProgress).filter(p => p.completed).length;
      const totalProgress = Object.values(allProgress).reduce((sum, p) => sum + p.progress, 0);
      const averageProgress = totalItems > 0 ? totalProgress / totalItems : 0;

      return {
        totalItems,
        completedItems,
        completionRate: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
        averageProgress,
        totalProgress
      };
    }
  };

  // Bookmark System
  static BookmarkManager = class {
    static addBookmark(contentId, title, metadata = {}) {
      const bookmark = {
        id: this.generateBookmarkId(),
        contentId,
        title,
        dateAdded: Date.now(),
        metadata,
        tags: metadata.tags || []
      };

      const bookmarks = this.getAllBookmarks();
      bookmarks[contentId] = bookmark;
      setStorageItem('user_bookmarks', bookmarks);

      // Update memory cache
      UserExperienceManager.bookmarks.set(contentId, bookmark);

      // Trigger bookmark event
      window.dispatchEvent(new CustomEvent('bookmarkAdded', {
        detail: { bookmark }
      }));

      return bookmark;
    }

    static removeBookmark(contentId) {
      const bookmarks = this.getAllBookmarks();
      const bookmark = bookmarks[contentId];
      delete bookmarks[contentId];
      setStorageItem('user_bookmarks', bookmarks);

      // Update memory cache
      UserExperienceManager.bookmarks.delete(contentId);

      // Trigger bookmark event
      window.dispatchEvent(new CustomEvent('bookmarkRemoved', {
        detail: { contentId, bookmark }
      }));

      return bookmark;
    }

    static isBookmarked(contentId) {
      return UserExperienceManager.bookmarks.has(contentId) ||
             !!this.getAllBookmarks()[contentId];
    }

    static getAllBookmarks() {
      return getStorageItem('user_bookmarks', {});
    }

    static getBookmarksByTag(tag) {
      const bookmarks = this.getAllBookmarks();
      return Object.values(bookmarks).filter(bookmark =>
        bookmark.tags.includes(tag)
      );
    }

    static generateBookmarkId() {
      return 'bookmark_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  };

  // Resume Watching System
  static ResumeManager = class {
    static setResumePoint(contentId, title, url, progress = 0, metadata = {}) {
      const resumePoint = {
        contentId,
        title,
        url,
        progress,
        lastWatched: Date.now(),
        metadata
      };

      setStorageItem('resume_watching', resumePoint);

      // Trigger resume point event
      window.dispatchEvent(new CustomEvent('resumePointUpdated', {
        detail: { resumePoint }
      }));

      return resumePoint;
    }

    static getResumePoint() {
      return getStorageItem('resume_watching');
    }

    static clearResumePoint() {
      removeStorageItem('resume_watching');
    }

    static getResumeHistory(limit = 10) {
      const history = getStorageItem('resume_history', []);
      return history.slice(0, limit);
    }

    static addToResumeHistory(contentId, title, url, progress) {
      const history = this.getResumeHistory(50); // Keep last 50 items
      const historyItem = {
        contentId,
        title,
        url,
        progress,
        watchedAt: Date.now()
      };

      // Remove existing entry for same content
      const filteredHistory = history.filter(item => item.contentId !== contentId);
      filteredHistory.unshift(historyItem); // Add to beginning

      setStorageItem('resume_history', filteredHistory);
    }
  };

  // User Preferences System
  static PreferencesManager = class {
    static getPreference(key, defaultValue = null) {
      return UserExperienceManager.userPreferences[key] ?? defaultValue;
    }

    static setPreference(key, value) {
      UserExperienceManager.userPreferences[key] = value;
      setStorageItem('user_preferences', UserExperienceManager.userPreferences);
    }

    static getAllPreferences() {
      return { ...UserExperienceManager.userPreferences };
    }

    static loadPreferences() {
      UserExperienceManager.userPreferences = getStorageItem('user_preferences', {});
    }

    static resetPreferences() {
      UserExperienceManager.userPreferences = {};
      removeStorageItem('user_preferences');
    }

    // Common preference getters/setters
    static getTheme() {
      return this.getPreference('theme', 'dark');
    }

    static setTheme(theme) {
      this.setPreference('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }

    static getAutoplay() {
      return this.getPreference('autoplay', false);
    }

    static setAutoplay(autoplay) {
      this.setPreference('autoplay', autoplay);
    }

    static getPlaybackSpeed() {
      return this.getPreference('playbackSpeed', 1);
    }

    static setPlaybackSpeed(speed) {
      this.setPreference('playbackSpeed', speed);
    }

    static getVolume() {
      return this.getPreference('volume', 1);
    }

    static setVolume(volume) {
      this.setPreference('volume', Math.min(Math.max(volume, 0), 1));
    }
  };

  // Achievement System
  static AchievementManager = class {
    static achievements = {
      first_video: { id: 'first_video', title: 'First Steps', description: 'Watched your first video', icon: '🎬' },
      completionist: { id: 'completionist', title: 'Completionist', description: 'Completed 10 videos', icon: '🏆' },
      bookworm: { id: 'bookworm', title: 'Bookworm', description: 'Bookmarked 5 items', icon: '📚' },
      dedicated: { id: 'dedicated', title: 'Dedicated', description: 'Studied for 5 hours', icon: '⏰' },
      explorer: { id: 'explorer', title: 'Explorer', description: 'Explored 20 different topics', icon: '🗺️' }
    };

    static checkAchievements() {
      const progress = UserExperienceManager.ProgressTracker.getProgressSummary();
      const bookmarks = UserExperienceManager.BookmarkManager.getAllBookmarks();
      const resumeHistory = UserExperienceManager.ResumeManager.getResumeHistory();

      const newAchievements = [];

      // Check first video achievement
      if (progress.totalItems >= 1 && !this.hasAchievement('first_video')) {
        this.unlockAchievement('first_video');
        newAchievements.push('first_video');
      }

      // Check completionist achievement
      if (progress.completedItems >= 10 && !this.hasAchievement('completionist')) {
        this.unlockAchievement('completionist');
        newAchievements.push('completionist');
      }

      // Check bookworm achievement
      if (Object.keys(bookmarks).length >= 5 && !this.hasAchievement('bookworm')) {
        this.unlockAchievement('bookworm');
        newAchievements.push('bookworm');
      }

      // Check dedicated achievement (5 hours of study time)
      const totalStudyTime = resumeHistory.reduce((total, item) => {
        return total + (item.metadata?.duration || 0);
      }, 0);
      if (totalStudyTime >= 18000 && !this.hasAchievement('dedicated')) { // 5 hours in seconds
        this.unlockAchievement('dedicated');
        newAchievements.push('dedicated');
      }

      // Check explorer achievement
      const uniqueTopics = new Set(resumeHistory.map(item => item.metadata?.topicId));
      if (uniqueTopics.size >= 20 && !this.hasAchievement('explorer')) {
        this.unlockAchievement('explorer');
        newAchievements.push('explorer');
      }

      if (newAchievements.length > 0) {
        this.showAchievementNotification(newAchievements);
      }

      return newAchievements;
    }

    static hasAchievement(achievementId) {
      const unlocked = getStorageItem('unlocked_achievements', []);
      return unlocked.includes(achievementId);
    }

    static unlockAchievement(achievementId) {
      const unlocked = getStorageItem('unlocked_achievements', []);
      if (!unlocked.includes(achievementId)) {
        unlocked.push(achievementId);
        setStorageItem('unlocked_achievements', unlocked);
      }
    }

    static getAllAchievements() {
      const unlocked = getStorageItem('unlocked_achievements', []);
      return Object.values(this.achievements).map(achievement => ({
        ...achievement,
        unlocked: unlocked.includes(achievement.id)
      }));
    }

    static showAchievementNotification(achievementIds) {
      achievementIds.forEach((id, index) => {
        setTimeout(() => {
          const achievement = this.achievements[id];
          if (achievement) {
            const notification = document.createElement('div');
            notification.className = 'achievement-notification fixed bottom-4 left-4 z-50 bg-green-900/90 border border-green-700/50 rounded-lg shadow-lg backdrop-blur-sm p-4 max-w-sm transform translate-y-full transition-transform duration-300';
            notification.innerHTML = `
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <span class="text-2xl">${achievement.icon}</span>
                </div>
                <div class="ml-3 w-0 flex-1">
                  <p class="text-sm font-medium text-green-100">
                    Achievement Unlocked!
                  </p>
                  <p class="text-sm font-bold text-green-300">
                    ${achievement.title}
                  </p>
                  <p class="mt-1 text-sm text-green-200">
                    ${achievement.description}
                  </p>
                </div>
              </div>
            `;

            document.body.appendChild(notification);

            // Animate in
            setTimeout(() => {
              notification.classList.remove('translate-y-full');
            }, 100);

            // Auto-remove after 5 seconds
            setTimeout(() => {
              notification.classList.add('translate-y-full');
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 300);
            }, 5000);
          }
        }, index * 1000); // Stagger notifications
      });
    }
  };

  // Initialize user experience features
  static init() {
    this.PreferencesManager.loadPreferences();
    this.checkAchievements();
  }

  // Check achievements periodically
  static checkAchievements() {
    return this.AchievementManager.checkAchievements();
  }
}

// Initialize user experience features
UserExperienceManager.init();

// Export UX utilities
window.UserExperienceManager = UserExperienceManager;