// Background Service Worker
try {
    importScripts('lib/db.js');
} catch (e) {
    console.error(e);
}

// --- INITIALIZATION ---

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log("Template Manager Pro Installed");

    // Seed DB
    await db.seed();

    // Context Menus
    chrome.contextMenus.create({
        id: "tmp_root",
        title: "Insert Template",
        contexts: ["editable"]
    });

    chrome.contextMenus.create({
        id: "tmp_manage",
        parentId: "tmp_root",
        title: "Manage Templates...",
        contexts: ["editable"]
    });

    chrome.contextMenus.create({
        id: "tmp_separator",
        parentId: "tmp_root",
        type: "separator",
        contexts: ["editable"]
    });

    // We can't easily populate dynamic submenus here without performance cost
    // So we'll add a generic Open Popup or quick access if needed.
    // For now, let's keep it clean.
});

// --- EVENT HANDLING ---

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "tmp_manage") {
        chrome.runtime.openOptionsPage();
    }
    else if (info.menuItemId === "tmp_save_selection") {
        // Fetch categories to pass to the modal
        const categories = await db.getAll('categories');

        chrome.tabs.sendMessage(tab.id, {
            action: "OPEN_QUICK_SAVE",
            text: info.selectionText,
            categories: categories
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SAVE_TEMPLATE_FROM_CONTENT') {
        (async () => {
            try {
                await db.add('templates', request.data);
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: e.toString() });
            }
        })();
        return true;
    }
    else if (request.action === 'GET_CATEGORIES') {
        (async () => {
            const cats = await db.getAll('categories');
            sendResponse({ categories: cats });
        })();
        return true;
    }
});
