// Settings page functionality
document.addEventListener('DOMContentLoaded', loadSettingsUI);

// Load settings and populate UI
async function loadSettingsUI() {
    const defaults = {
        scrollDelay: 300,
        scrollSpeed: 500,
        defaultFormat: 'png',
        imageQuality: 1.0,
        filenameTemplate: 'OmniCapture_{timestamp}',
        autoOpenEditor: true,
        hideScrollbars: false,
        defaultTool: 'pen',
        maxHistoryItems: 50
    };

    chrome.storage.sync.get(defaults, (settings) => {
        // Populate form
        document.getElementById('scrollDelay').value = settings.scrollDelay;
        document.getElementById('scrollSpeed').value = settings.scrollSpeed;
        document.getElementById('defaultFormat').value = settings.defaultFormat;
        document.getElementById('imageQuality').value = settings.imageQuality;
        document.getElementById('qualityValue').textContent = Math.round(settings.imageQuality * 100) + '%';
        document.getElementById('filenameTemplate').value = settings.filenameTemplate;
        document.getElementById('autoOpenEditor').checked = settings.autoOpenEditor;
        document.getElementById('hideScrollbars').checked = settings.hideScrollbars;
        document.getElementById('defaultTool').value = settings.defaultTool;
        document.getElementById('maxHistoryItems').value = settings.maxHistoryItems;
    });

    setupEventListeners();
}

function setupEventListeners() {
    // Quality slider live update
    document.getElementById('imageQuality').addEventListener('input', (e) => {
        document.getElementById('qualityValue').textContent = Math.round(e.target.value * 100) + '%';
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveSettings);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);

    // Clear history button
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
}

async function saveSettings() {
    const settings = {
        scrollDelay: parseInt(document.getElementById('scrollDelay').value),
        scrollSpeed: parseInt(document.getElementById('scrollSpeed').value),
        defaultFormat: document.getElementById('defaultFormat').value,
        imageQuality: parseFloat(document.getElementById('imageQuality').value),
        filenameTemplate: document.getElementById('filenameTemplate').value,
        autoOpenEditor: document.getElementById('autoOpenEditor').checked,
        hideScrollbars: document.getElementById('hideScrollbars').checked,
        defaultTool: document.getElementById('defaultTool').value,
        maxHistoryItems: parseInt(document.getElementById('maxHistoryItems').value)
    };

    chrome.storage.sync.set(settings, () => {
        showNotification('Settings saved successfully!');
    });
}

function resetToDefaults() {
    if (confirm('Reset all settings to default values?')) {
        const defaults = {
            scrollDelay: 300,
            scrollSpeed: 500,
            defaultFormat: 'png',
            imageQuality: 1.0,
            filenameTemplate: 'OmniCapture_{timestamp}',
            autoOpenEditor: true,
            hideScrollbars: false,
            defaultTool: 'pen',
            maxHistoryItems: 50
        };

        chrome.storage.sync.set(defaults, () => {
            loadSettingsUI();
            showNotification('Settings reset to defaults!');
        });
    }
}

function clearHistory() {
    if (confirm('Delete all screenshot history? This cannot be undone.')) {
        chrome.storage.local.set({ screenshotHistory: [] }, () => {
            showNotification('History cleared!');
        });
    }
}

function showNotification(message) {
    const notification = document.getElementById('saveNotification');
    notification.textContent = '✓ ' + message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
