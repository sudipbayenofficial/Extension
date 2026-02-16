// Background Script
// Handles installation and basic state
chrome.runtime.onInstalled.addListener(() => {
    console.log("Tab Refresher+ Installed");
});

// We can add context menu support here later if requested
