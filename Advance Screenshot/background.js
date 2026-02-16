chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capture_visible') {
        captureVisible();
    } else if (request.action === 'process_partial') {
        capturePartial(request.area);
    } else if (request.action === 'capture_full') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) captureFullPage(tabs[0].id);
        });
    }
});

function captureVisible() {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
        chrome.storage.local.set({
            screenshotData: {
                type: 'visible',
                image: dataUrl
            }
        }, () => {
            chrome.tabs.create({url: 'result.html'});
        });
    });
}

function capturePartial(area) {
     chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
        chrome.storage.local.set({
            screenshotData: {
                type: 'partial',
                image: dataUrl,
                area: area
            }
        }, () => {
            chrome.tabs.create({url: 'result.html'});
        });
    });
}

async function captureFullPage(tabId) {
    try {
        const info = await sendMessagePromise(tabId, {action: 'get_scroll_info'});
        const { width, height, windowHeight, pixelRatio } = info;
        const screenshots = [];
        let nextY = 0;
        
        while (true) {
            const response = await sendMessagePromise(tabId, {action: 'set_scroll', y: nextY});
            const actualY = response.y;
            
            // Wait for render/lazy-load
            await new Promise(r => setTimeout(r, 800));
            
            const dataUrl = await captureTabPromise();
            screenshots.push({
                y: actualY,
                image: dataUrl
            });
            
            // If we have reached the bottom
            // Note: windowHeight is the viewport height. 
            // If actualY + windowHeight >= height, we have covered the end.
            if (actualY + windowHeight >= height) {
                break;
            }
            
            // If we didn't move (e.g. page shorter than expected or stuck), break to avoid infinite loop
            if (screenshots.length > 1 && screenshots[screenshots.length-2].y === actualY) {
                break;
            }

            nextY += windowHeight;
        }
        
        // Restore scroll
        await sendMessagePromise(tabId, {action: 'set_scroll', y: 0});

        chrome.storage.local.set({
            screenshotData: {
                type: 'full',
                segments: screenshots,
                totalWidth: width,
                totalHeight: height,
                windowHeight: windowHeight,
                pixelRatio: pixelRatio
            }
        }, () => {
            chrome.tabs.create({url: 'result.html'});
        });
    } catch (e) {
        console.error('Full page capture failed:', e);
    }
}

function sendMessagePromise(tabId, msg) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, msg, (response) => {
             if (chrome.runtime.lastError) {
                 reject(chrome.runtime.lastError);
             } else {
                 resolve(response);
             }
        });
    });
}

function captureTabPromise() {
     return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(dataUrl);
            }
        });
    });
}
