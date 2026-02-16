// Popup Script
document.addEventListener('DOMContentLoaded', () => {
    initializePopup();
});

let currentTabId = null;
let currentHost = '';

async function initializePopup() {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    currentTabId = tab.id;

    // Skip internal chrome pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
        document.body.innerHTML = '<div style="padding:20px;text-align:center;">Cannot run on system pages.</div>';
        return;
    }

    try {
        const url = new URL(tab.url);
        currentHost = url.hostname;
    } catch (e) {
        console.error('Invalid URL');
    }

    // Try to connect to content script, inject if needed
    try {
        await ensureContentScript(currentTabId);
    } catch (e) {
        console.error('Failed to inject script:', e);
    }

    setupEventListeners();
    loadSavedState();
    loadRulesList();
}

// Failsafe: Inject content script if not responsive
async function ensureContentScript(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Content script not found, injecting...');
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }, () => {
                    chrome.scripting.insertCSS({
                        target: { tabId: tabId },
                        files: ['content.css']
                    }, resolve);
                });
            } else {
                resolve();
            }
        });
    });
}

function setupEventListeners() {
    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const viewId = e.target.dataset.view;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');

            if (viewId === 'rules') {
                loadRulesList();
            }
        });
    });

    // Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const seconds = e.target.dataset.time;
            document.getElementById('customTime').value = seconds;
            document.getElementById('timeUnit').value = "1";
        });
    });

    // Start Button
    document.getElementById('startBtn').addEventListener('click', () => {
        startRefresh();
    });

    // Stop Button
    document.getElementById('stopBtn').addEventListener('click', () => {
        stopRefresh();
    });

    // Custom Input Change
    document.getElementById('customTime').addEventListener('input', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    });
}

function loadRulesList() {
    const list = document.getElementById('rulesList');
    list.innerHTML = '';

    chrome.storage.sync.get(['urlSettings'], (result) => {
        const settings = result.urlSettings || {};
        const hosts = Object.keys(settings);

        if (hosts.length === 0) {
            list.innerHTML = '<div class="empty-state">No saved rules yet.<br>Enable "Auto-start" to save a rule.</div>';
            return;
        }

        hosts.forEach(host => {
            const rule = settings[host];
            if (!rule.enabled) return;

            const item = document.createElement('div');
            item.className = 'rule-item';

            const timeStr = formatTime(rule.interval);

            item.innerHTML = `
                <div class="rule-info">
                    <div class="rule-domain">${host}</div>
                    <div class="rule-time">Every ${timeStr} • ${rule.interactionReset ? 'Smart Reset' : 'Fixed'}</div>
                </div>
                <div class="rule-actions">
                    <button class="icon-btn delete-btn" title="Delete Rule">🗑️</button>
                </div>
            `;

            item.querySelector('.delete-btn').addEventListener('click', () => {
                delete settings[host];
                chrome.storage.sync.set({ urlSettings: settings }, () => {
                    loadRulesList();
                    if (host === currentHost) {
                        document.getElementById('saveUrl').checked = false;
                    }
                });
            });

            list.appendChild(item);
        });
    });
}

function loadSavedState() {
    // Check Content Script Status
    chrome.tabs.sendMessage(currentTabId, { action: "getStatus" }, (response) => {
        // If still error after injection attempt, just ignore
        if (chrome.runtime.lastError) return;

        if (response && response.running) {
            updateStatus(true, response.timeLeft);
        } else {
            updateStatus(false);
        }
    });

    // Load Checkbox State
    chrome.storage.sync.get(['urlSettings'], (result) => {
        const settings = result.urlSettings || {};
        if (settings[currentHost] && settings[currentHost].enabled) {
            document.getElementById('saveUrl').checked = true;
            if (!document.getElementById('customTime').value) {
                document.getElementById('customTime').value = settings[currentHost].interval;
            }
        }
    });
}

function startRefresh() {
    const timeInput = parseInt(document.getElementById('customTime').value);
    const multiplier = parseInt(document.getElementById('timeUnit').value);

    if (!timeInput || timeInput <= 0) {
        alert('Please enter a valid time');
        return;
    }

    const intervalSeconds = timeInput * multiplier;
    const saveUrl = document.getElementById('saveUrl').checked;
    const interactionReset = document.getElementById('interactionReset').checked;

    // Save Rule
    if (saveUrl && currentHost) {
        chrome.storage.sync.get(['urlSettings'], (result) => {
            const settings = result.urlSettings || {};
            settings[currentHost] = {
                interval: intervalSeconds,
                interactionReset: interactionReset,
                enabled: true
            };
            chrome.storage.sync.set({ urlSettings: settings });
        });
    }

    // Start Timer
    chrome.tabs.sendMessage(currentTabId, {
        action: "start",
        interval: intervalSeconds,
        interactionReset: interactionReset
    }, (response) => {
        if (chrome.runtime.lastError) {
            // Retry once if needed?
            console.error('Failed to send start command');
        } else {
            updateStatus(true);
        }
    });
}

function stopRefresh() {
    chrome.tabs.sendMessage(currentTabId, { action: "stop" });

    if (currentHost) {
        chrome.storage.sync.get(['urlSettings'], (result) => {
            const settings = result.urlSettings || {};
            if (settings[currentHost]) {
                settings[currentHost].enabled = false;
                chrome.storage.sync.set({ urlSettings: settings });
                document.getElementById('saveUrl').checked = false;
            }
        });
    }

    updateStatus(false);
}

function updateStatus(running, timeLeft) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (running) {
        dot.classList.add('active');
        text.textContent = timeLeft ? `Running (${formatTime(timeLeft)})` : 'Running';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
    } else {
        dot.classList.remove('active');
        text.textContent = 'Timer stopped';
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
    }
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
}
