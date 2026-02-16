/**
 * Background Service Worker - TextExpander Pro
 */

// Initialize database on install
chrome.runtime.onInstalled.addListener(async () => {
    console.log('TextExpander Pro Installed');
});

// Context Menus
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'insert-template',
        title: 'Insert Template',
        contexts: ['editable']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'insert-template') {
        // Open popup or command palette
        chrome.action.openPopup();
    }
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'OPEN_OPTIONS') {
        chrome.runtime.openOptionsPage();
    }
});
