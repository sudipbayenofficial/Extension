// Background Service Worker
let settings = {
    scrollDelay: 300,
    scrollSpeed: 500,
    defaultFormat: 'png',
    imageQuality: 1.0,
    filenameTemplate: 'Screenshot_{timestamp}',
    autoOpenEditor: true,
    defaultTool: 'pen',
    maxHistoryItems: 50
};

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
    // Load or set default settings
    chrome.storage.sync.get(settings, (result) => {
        settings = result;
        chrome.storage.sync.set(result);
    });

    // Create context menus
    chrome.contextMenus.create({
        id: 'capture-element',
        title: 'Capture This Element',
        contexts: ['all']
    });

    chrome.contextMenus.create({
        id: 'capture-visible',
        title: 'Capture Visible Area',
        contexts: ['all']
    });
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        chrome.storage.sync.get(null, (result) => {
            settings = result;
        });
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            if (command === 'capture-area') {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'start_partial_capture' });
            } else if (command === 'capture-visible') {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'start_visible_capture' });
            }
        }
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'capture-element') {
        chrome.tabs.sendMessage(tab.id, { action: 'start_element_capture' });
    } else if (info.menuItemId === 'capture-visible') {
        chrome.tabs.sendMessage(tab.id, { action: 'start_visible_capture' });
    }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message.action);

    if (message.action === "capture_tab") {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error('Capture error:', chrome.runtime.lastError);
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                console.log('Captured successfully');
                sendResponse({ dataUrl: dataUrl });
            }
        });
        return true; // Keep channel open
    }

    if (message.action === "download") {
        downloadScreenshot(message.dataUrl, message.settings || {}, message.pageInfo || {});
        sendResponse({ success: true });
    }

    if (message.action === "open_editor") {
        openEditorTab(message.dataUrl);
        sendResponse({ success: true });
    }

    if (message.action === "capture_all_tabs") {
        captureAllTabs(message.tabs);
        sendResponse({ success: true });
    }

    if (message.action === "get_settings") {
        sendResponse({ settings: settings });
        return true;
    }
});

// Download screenshot
function downloadScreenshot(dataUrl, userSettings = {}, pageInfo = {}) {
    const mergedSettings = { ...settings, ...userSettings };
    const filename = generateFilename(mergedSettings.filenameTemplate, mergedSettings.defaultFormat, pageInfo);

    console.log('Downloading:', filename);

    chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
    }, (downloadId) => {
        if (chrome.runtime.lastError) {
            console.error('Download error:', chrome.runtime.lastError);
        } else {
            console.log('Download started:', downloadId);
            saveToHistory({
                id: Date.now().toString(),
                dataUrl: dataUrl,
                filename: filename,
                timestamp: Date.now()
            });
        }
    });
}

// Open editor
function openEditorTab(dataUrl) {
    chrome.storage.local.set({ tempScreenshot: dataUrl }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
    });
}

// Save to history
function saveToHistory(screenshot) {
    chrome.storage.local.get(['screenshotHistory'], (result) => {
        let history = result.screenshotHistory || [];
        history.unshift(screenshot);

        if (history.length > settings.maxHistoryItems) {
            history = history.slice(0, settings.maxHistoryItems);
        }

        chrome.storage.local.set({ screenshotHistory: history });
    });
}

// Generate filename
function generateFilename(template = 'Screenshot_{timestamp}', format = 'png', pageInfo = {}) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const timestamp = Date.now();
    const domain = pageInfo.domain || 'page';
    const title = (pageInfo.title || 'screenshot').substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');

    let filename = template
        .replace('{date}', date)
        .replace('{time}', time)
        .replace('{timestamp}', timestamp)
        .replace('{domain}', domain)
        .replace('{title}', title);

    return `${filename}.${format}`;
}

// Capture all tabs
async function captureAllTabs(tabs) {
    console.log('Capturing', tabs.length, 'tabs');

    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];

        try {
            await chrome.tabs.update(tab.id, { active: true });
            await new Promise(r => setTimeout(r, 500));

            chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
                if (!chrome.runtime.lastError && dataUrl) {
                    const filename = `Tab_${i + 1}_${(tab.title || 'untitled').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                    chrome.downloads.download({ url: dataUrl, filename: filename, saveAs: false });
                }
            });
        } catch (error) {
            console.error('Error capturing tab:', error);
        }
    }
}
