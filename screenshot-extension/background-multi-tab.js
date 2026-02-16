/**
 * Capture all tabs in current window
 */
async function captureAllTabs(tabs) {
    console.log('Capturing', tabs.length, 'tabs');

    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];

        // Switch to tab
        await chrome.tabs.update(tab.id, { active: true });

        // Wait for tab to be ready
        await new Promise(r => setTimeout(r, 500));

        // Capture
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error('Error capturing tab:', tab.title, chrome.runtime.lastError);
                return;
            }

            const filename = generateFilename(
                `Tab_${i + 1}_${tab.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`,
                settings.defaultFormat || 'png',
                { domain: new URL(tab.url).hostname, title: tab.title }
            );

            chrome.downloads.download({
                url: dataUrl,
                filename: filename,
                saveAs: false
            });
        });
    }
}
