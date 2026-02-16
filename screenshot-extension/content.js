// Content Script - 4 Features Only
console.log('OmniCapture: Content script loaded');

let settings = {};

// Load settings
(async function () {
    try {
        const response = await chrome.runtime.sendMessage({ action: "get_settings" });
        if (response && response.settings) {
            settings = response.settings;
            console.log('OmniCapture: Settings loaded', settings);
        }
    } catch (error) {
        console.error('OmniCapture: Failed to load settings:', error);
        settings = {
            autoOpenEditor: false,
            defaultFormat: 'png',
            imageQuality: 1.0
        };
    }
})();

// Message listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('OmniCapture: Content received:', request.action);

    try {
        if (request.action === "start_partial_capture") {
            initSelectionTool();
        } else if (request.action === "start_element_capture") {
            initElementCapture();
        } else if (request.action === "start_delayed_capture") {
            startDelayedCapture(request.delay || 3);
        } else if (request.action === "start_custom_size_capture") {
            captureCustomSize(request.width || 1920, request.height || 1080);
        }
        sendResponse({ success: true });
    } catch (error) {
        console.error('OmniCapture: Error handling message:', error);
        sendResponse({ success: false, error: error.message });
    }
    return true;
});

// Delayed Capture - Captures custom size after delay
function startDelayedCapture(seconds) {
    const countdown = document.createElement('div');
    countdown.className = 'omnicapture-countdown';
    countdown.textContent = seconds;
    document.body.appendChild(countdown);

    let remaining = seconds;
    const interval = setInterval(function () {
        remaining--;
        countdown.textContent = remaining;

        if (remaining === 0) {
            clearInterval(interval);
            countdown.remove();

            // Get custom dimensions from last used or default
            const width = parseInt(document.getElementById('customWidth')?.value) || 1920;
            const height = parseInt(document.getElementById('customHeight')?.value) || 1080;
            captureCustomSize(width, height);
        }
    }, 1000);
}

// Custom Size Screenshot
async function captureCustomSize(width, height) {
    try {
        console.log('OmniCapture: Starting custom size capture:', width, 'x', height);
        showProgress('Capturing ' + width + 'x' + height + '...');

        const response = await chrome.runtime.sendMessage({ action: "capture_tab" });

        if (!response || !response.dataUrl) {
            throw new Error('Failed to capture');
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const img = new Image();

        img.onload = function () {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.drawImage(img, 0, 0, width * dpr, height * dpr);

            hideProgress();

            const dataUrl = canvas.toDataURL('image/png', 1.0);

            if (settings.autoOpenEditor) {
                openEditor(dataUrl);
            } else {
                chrome.runtime.sendMessage({
                    action: "download",
                    dataUrl: dataUrl,
                    settings: settings,
                    pageInfo: {
                        domain: window.location.hostname,
                        title: document.title
                    }
                });
                showToast('Screenshot saved (' + width + 'x' + height + ')!', 2000, 'success');
            }
        };

        img.onerror = function () {
            hideProgress();
            showToast('Failed to process image', 3000, 'error');
        };

        img.src = response.dataUrl;
    } catch (error) {
        hideProgress();
        console.error('OmniCapture: Custom size error:', error);
        showToast('Capture failed: ' + error.message, 3000, 'error');
    }
}

// Selection Tool
function initSelectionTool() {
    console.log('OmniCapture: Initializing selection tool');

    const overlay = document.createElement('div');
    overlay.className = 'omnicapture-overlay';

    const selection = document.createElement('div');
    selection.className = 'omnicapture-selection';

    const helperText = document.createElement('div');
    helperText.className = 'omnicapture-helper-text';
    helperText.innerHTML = 'Click and drag to select area • Press ESC to cancel';

    document.body.appendChild(overlay);
    overlay.appendChild(selection);
    document.body.appendChild(helperText);

    let isDrawing = false;
    let startX, startY;

    overlay.onmousedown = function (e) {
        isDrawing = true;
        startX = e.clientX;
        startY = e.clientY;
        selection.style.left = startX + 'px';
        selection.style.top = startY + 'px';
        selection.style.width = '0';
        selection.style.height = '0';
    };

    overlay.onmousemove = function (e) {
        if (!isDrawing) return;
        const width = e.clientX - startX;
        const height = e.clientY - startY;
        selection.style.width = Math.abs(width) + 'px';
        selection.style.height = Math.abs(height) + 'px';
        selection.style.left = (width > 0 ? startX : e.clientX) + 'px';
        selection.style.top = (height > 0 ? startY : e.clientY) + 'px';
    };

    overlay.onmouseup = async function (e) {
        if (!isDrawing) return;
        isDrawing = false;
        const rect = selection.getBoundingClientRect();

        if (rect.width < 10 || rect.height < 10) {
            overlay.remove();
            helperText.remove();
            showToast('Selection too small', 2000, 'error');
            return;
        }

        overlay.remove();
        helperText.remove();

        const response = await chrome.runtime.sendMessage({ action: "capture_tab" });
        if (response && response.dataUrl) {
            cropSelection(response.dataUrl, rect);
        }
    };

    const escHandler = function (e) {
        if (e.key === 'Escape') {
            overlay.remove();
            helperText.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Crop Selection
function cropSelection(dataUrl, rect) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const img = new Image();

    img.onload = function () {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.drawImage(img,
            rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr,
            0, 0, rect.width * dpr, rect.height * dpr
        );

        const finalDataUrl = canvas.toDataURL('image/png', 1.0);

        if (settings.autoOpenEditor) {
            openEditor(finalDataUrl);
        } else {
            chrome.runtime.sendMessage({
                action: "download",
                dataUrl: finalDataUrl,
                settings: settings,
                pageInfo: {
                    domain: window.location.hostname,
                    title: document.title
                }
            });
            showToast('Area captured!', 2000, 'success');
        }
    };
    img.src = dataUrl;
}

// Element Capture
function initElementCapture() {
    console.log('OmniCapture: Initializing element capture');

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483645; cursor: crosshair;';

    const highlight = document.createElement('div');
    highlight.className = 'omnicapture-element-highlight';

    const helperText = document.createElement('div');
    helperText.className = 'omnicapture-helper-text';
    helperText.innerHTML = 'Click any element to capture • Press ESC to cancel';

    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    document.body.appendChild(helperText);

    let currentElement = null;

    overlay.onmousemove = function (e) {
        overlay.style.pointerEvents = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        overlay.style.pointerEvents = 'auto';

        if (el && el !== currentElement && el !== document.body) {
            currentElement = el;
            const rect = el.getBoundingClientRect();
            highlight.style.left = rect.left + 'px';
            highlight.style.top = rect.top + 'px';
            highlight.style.width = rect.width + 'px';
            highlight.style.height = rect.height + 'px';
            highlight.style.display = 'block';
        }
    };

    overlay.onclick = async function (e) {
        if (!currentElement) return;

        overlay.remove();
        highlight.remove();
        helperText.remove();

        const rect = currentElement.getBoundingClientRect();
        const response = await chrome.runtime.sendMessage({ action: "capture_tab" });
        if (response && response.dataUrl) {
            cropSelection(response.dataUrl, rect);
        }
    };

    const escHandler = function (e) {
        if (e.key === 'Escape') {
            overlay.remove();
            highlight.remove();
            helperText.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Helper Functions
function openEditor(dataUrl) {
    chrome.runtime.sendMessage({ action: "open_editor", dataUrl: dataUrl });
}

let progressElement = null;

function showProgress(text) {
    if (!progressElement) {
        progressElement = document.createElement('div');
        progressElement.className = 'omnicapture-progress';
        progressElement.innerHTML = '<div class="omnicapture-spinner"></div><div class="omnicapture-progress-text"></div>';
        document.body.appendChild(progressElement);
    }
    progressElement.querySelector('.omnicapture-progress-text').textContent = text;
    progressElement.style.display = 'flex';
}

function hideProgress() {
    if (progressElement) {
        progressElement.style.display = 'none';
    }
}

function showToast(message, duration, type) {
    duration = duration || 2000;
    type = type || 'info';

    const toast = document.createElement('div');
    toast.className = 'omnicapture-toast omnicapture-toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function () {
        toast.classList.add('show');
    }, 10);

    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () {
            toast.remove();
        }, 300);
    }, duration);
}

console.log('OmniCapture: Content script initialization complete');