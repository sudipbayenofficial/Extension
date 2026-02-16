// Utility Functions for OmniCapture Pro

/**
 * Load settings from storage
 */
async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            scrollDelay: 300,
            scrollSpeed: 500,
            defaultFormat: 'png',
            imageQuality: 1.0,
            filenameTemplate: 'Screenshot_{timestamp}',
            autoOpenEditor: true,
            hideScrollbars: false,
            defaultTool: 'pen',
            colorPresets: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#000000'],
            maxHistoryItems: 50
        }, (result) => {
            resolve(result);
        });
    });
}

/**
 * Save settings to storage
 */
async function saveSettings(settings) {
    return new Promise((resolve) => {
        chrome.storage.sync.set(settings, () => {
            resolve();
        });
    });
}

/**
 * Generate filename from template
 */
function generateFilename(template = 'Screenshot_{timestamp}', format = 'png', context = {}) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const timestamp = Date.now();
    const domain = context.domain || window.location?.hostname || 'page';
    const title = (context.title || document?.title || 'screenshot').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');

    let filename = template
        .replace('{date}', date)
        .replace('{time}', time)
        .replace('{timestamp}', timestamp)
        .replace('{domain}', domain)
        .replace('{title}', title);

    return `${filename}.${format}`;
}

/**
 * Convert canvas to data URL with format and quality
 */
function canvasToDataURL(canvas, format = 'png', quality = 1.0) {
    const mimeType = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' :
        format === 'webp' ? 'image/webp' : 'image/png';
    return canvas.toDataURL(mimeType, quality);
}

/**
 * Show toast notification
 */
function showToast(message, duration = 2000, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `omnicapture-toast omnicapture-toast-${type}`;
    toast.textContent = message;

    if (!document.body) {
        console.warn('Cannot show toast: document.body not available');
        return;
    }

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Generate thumbnail from data URL
 */
async function generateThumbnail(dataUrl, maxWidth = 200, maxHeight = 150) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataUrl;
    });
}

/**
 * Get storage information
 */
async function getStorageInfo() {
    return new Promise((resolve) => {
        chrome.storage.local.getBytesInUse(null, (bytes) => {
            resolve({
                used: bytes,
                usedMB: (bytes / 1024 / 1024).toFixed(2)
            });
        });
    });
}

/**
 * Copy image to clipboard
 */
async function copyImageToClipboard(dataUrl) {
    try {
        const blob = await (await fetch(dataUrl)).blob();
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}
