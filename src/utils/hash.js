/**
 * Re/curse - Hash Utilities
 * SHA-256 hashing using Web Crypto API
 */

/**
 * Generate SHA-256 hash of content
 * @param {string|ArrayBuffer|Blob} content - Content to hash
 * @returns {Promise<string>} - Hex-encoded hash
 */
export async function sha256(content) {
    let buffer;

    if (typeof content === 'string') {
        buffer = new TextEncoder().encode(content);
    } else if (content instanceof Blob) {
        buffer = await content.arrayBuffer();
    } else if (content instanceof ArrayBuffer) {
        buffer = content;
    } else {
        throw new Error('Unsupported content type for hashing');
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a short hash ID for URLs
 * @param {string} url - URL to hash
 * @returns {Promise<string>} - Short hash ID
 */
export async function hashUrl(url) {
    const hash = await sha256(url);
    return hash.substring(0, 16); // First 16 chars is enough for uniqueness
}

/**
 * Generate file content hash for deduplication
 * @param {Blob} blob - File content
 * @returns {Promise<string>} - Full hash
 */
export async function hashContent(blob) {
    return sha256(blob);
}
