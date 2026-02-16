// Popup Script
document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
});

function setupEventListeners() {
    // Select Area
    const selectAreaBtn = document.getElementById('selectArea');
    if (selectAreaBtn) {
        selectAreaBtn.addEventListener('click', function () {
            captureMode('partial');
        });
    }

    // Capture Element
    const captureElementBtn = document.getElementById('captureElement');
    if (captureElementBtn) {
        captureElementBtn.addEventListener('click', function () {
            captureMode('element');
        });
    }

    // Delayed capture buttons
    const delayBtns = document.querySelectorAll('.delay-btn');
    delayBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const delay = parseInt(btn.dataset.delay);
            startDelayedCapture(delay);
        });
    });

    // Preset buttons
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const width = btn.dataset.width;
            const height = btn.dataset.height;
            document.getElementById('customWidth').value = width;
            document.getElementById('customHeight').value = height;
        });
    });

    // Capture custom size
    const captureCustomBtn = document.getElementById('captureCustom');
    if (captureCustomBtn) {
        captureCustomBtn.addEventListener('click', function () {
            const width = parseInt(document.getElementById('customWidth').value);
            const height = parseInt(document.getElementById('customHeight').value);

            if (width > 0 && height > 0) {
                captureCustomSize(width, height);
            } else {
                updateStatus('Please enter valid dimensions', false);
            }
        });
    }

    // Footer buttons
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', function () {
            chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
        });
    }

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            chrome.runtime.openOptionsPage();
        });
    }
}

async function captureMode(mode) {
    updateStatus('Starting capture...', true);

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];

        if (!tab) {
            updateStatus('No active tab found', false);
            return;
        }

        let action = '';
        if (mode === 'partial') {
            action = 'start_partial_capture';
            updateStatus('Select area on page...', true);
        } else if (mode === 'element') {
            action = 'start_element_capture';
            updateStatus('Click element on page...', true);
        }

        chrome.tabs.sendMessage(tab.id, { action: action }, function (response) {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
                updateStatus('Error: ' + chrome.runtime.lastError.message, false);
            } else {
                window.close();
            }
        });
    } catch (error) {
        console.error('Capture error:', error);
        updateStatus('Error: ' + error.message, false);
    }
}

async function startDelayedCapture(delay) {
    updateStatus('Starting in ' + delay + 's...', true);

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];

        if (!tab) {
            updateStatus('No active tab found', false);
            return;
        }

        chrome.tabs.sendMessage(tab.id, {
            action: 'start_delayed_capture',
            delay: delay
        }, function (response) {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
                updateStatus('Error: ' + chrome.runtime.lastError.message, false);
            } else {
                window.close();
            }
        });
    } catch (error) {
        console.error('Delayed capture error:', error);
        updateStatus('Error: ' + error.message, false);
    }
}

async function captureCustomSize(width, height) {
    updateStatus('Capturing ' + width + 'x' + height + '...', true);

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];

        if (!tab) {
            updateStatus('No active tab found', false);
            return;
        }

        chrome.tabs.sendMessage(tab.id, {
            action: 'start_custom_size_capture',
            width: width,
            height: height
        }, function (response) {
            if (chrome.runtime.lastError) {
                console.error('Error:', chrome.runtime.lastError);
                updateStatus('Error: ' + chrome.runtime.lastError.message, false);
            } else {
                window.close();
            }
        });
    } catch (error) {
        console.error('Capture error:', error);
        updateStatus('Error: ' + error.message, false);
    }
}

function updateStatus(message, isCapturing) {
    const status = document.getElementById('statusText');
    if (status) {
        status.textContent = message;
        if (isCapturing) {
            status.classList.add('capturing');
        } else {
            status.classList.remove('capturing');
        }
    }
}