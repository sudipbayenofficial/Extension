// Content Script - Tab Refresher+
(function () {
    if (window.tabRefresherInitialized) return;
    window.tabRefresherInitialized = true;

    console.log('Tab Refresher+: Initializing...');

    let timerInterval = null;
    let remainingTime = 0;
    let initialTime = 0;
    let isRunning = false;
    let config = {
        interactionReset: true
    };

    let timerElement = null;

    function init() {
        // 1. Session Storage Check
        try {
            const sessionState = sessionStorage.getItem('tabRefresherState');
            if (sessionState) {
                const state = JSON.parse(sessionState);
                if (state && state.isRunning) {
                    console.log('Tab Refresher+: Resuming from session');
                    startTimer(state.interval, state.interactionReset);
                    // Don't return here, we still want to setup listeners
                }
            } else {
                // 2. Storage Check (Auto-start Rules) - Only if no active session
                checkSavedRules();
            }
        } catch (e) {
            console.error('Session read error:', e);
            checkSavedRules();
        }

        setupInteractionListeners();
    }

    function checkSavedRules() {
        const hostname = window.location.hostname;
        chrome.storage.sync.get(['urlSettings'], (result) => {
            const settings = result.urlSettings || {};
            if (settings[hostname] && settings[hostname].enabled) {
                console.log('Tab Refresher+: Auto-starting from rule');
                startTimer(settings[hostname].interval, settings[hostname].interactionReset);
            }
        });
    }

    function setupInteractionListeners() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
        // Use capture: true to catch events even if page tries to stop propagation
        events.forEach(event => {
            document.addEventListener(event, handleInteraction, { passive: true, capture: true });
        });
    }

    let throttleTimer;
    function handleInteraction() {
        if (!isRunning || !config.interactionReset) return;

        // If we are currently throttled, ignore
        if (throttleTimer) return;

        // IMMEDIATE RESET Logic
        // We do not wait for timeout to reset. We reset immediately for responsiveness.
        if (remainingTime !== initialTime) {
            // console.log('Tab Refresher+: User interaction detected - Resetting timer');
            remainingTime = initialTime;
            updateTimerUI();
            showResetAnimation();
        }

        // Set throttle to prevent spamming the reset logic (e.g. while scrolling)
        throttleTimer = setTimeout(() => {
            throttleTimer = null;
        }, 200); // 200ms throttle is more responsive than 1s
    }

    function startTimer(seconds, interactionReset = true) {
        stopTimer(false);

        initialTime = seconds;
        remainingTime = seconds;
        config.interactionReset = interactionReset;
        isRunning = true;

        sessionStorage.setItem('tabRefresherState', JSON.stringify({
            interval: seconds,
            interactionReset: interactionReset,
            isRunning: true
        }));

        createTimerUI();
        updateTimerUI();

        timerInterval = setInterval(() => {
            remainingTime--;
            updateTimerUI();

            if (remainingTime <= 0) {
                reloadPage();
            }
        }, 1000);
    }

    function stopTimer(clearSession = true) {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isRunning = false;

        if (timerElement) {
            timerElement.remove();
            timerElement = null;
        }

        if (clearSession) {
            sessionStorage.removeItem('tabRefresherState');
        }
    }

    function reloadPage() {
        if (timerInterval) clearInterval(timerInterval);
        window.location.reload();
    }

    function createTimerUI() {
        if (document.getElementById('tab-refresher-timer')) return;
        timerElement = document.createElement('div');
        timerElement.id = 'tab-refresher-timer';
        document.body.appendChild(timerElement);
    }

    function updateTimerUI() {
        if (!timerElement) createTimerUI();

        const mins = Math.floor(remainingTime / 60);
        const secs = remainingTime % 60;
        const timeString = mins > 0
            ? `${mins}:${secs.toString().padStart(2, '0')}`
            : `${secs}s`;

        timerElement.textContent = timeString;

        if (remainingTime <= 5) {
            timerElement.classList.add('warning');
        } else {
            timerElement.classList.remove('warning');
        }
    }

    function showResetAnimation() {
        if (timerElement) {
            timerElement.style.backgroundColor = 'rgba(34, 197, 94, 0.9)';
            timerElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                timerElement.style.backgroundColor = '';
                timerElement.style.transform = '';
            }, 200);
        }
    }

    // Message Listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "ping") {
            sendResponse({ status: "ok" });
            return;
        }

        if (request.action === "start") {
            startTimer(request.interval, request.interactionReset);
            sendResponse({ success: true });
        } else if (request.action === "stop") {
            stopTimer(true);
            sendResponse({ success: true });
        } else if (request.action === "getStatus") {
            sendResponse({
                running: isRunning,
                timeLeft: remainingTime
            });
        }
    });

    init();

})();
