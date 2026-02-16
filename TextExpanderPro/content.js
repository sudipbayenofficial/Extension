/**
 * Content Script - TextExpander Pro
 * Handles text expansion trigger detection and replacement
 */

// Configuration
const TRIGGER_PREFIX = ';';
const BUFFER_SIZE = 20;

// State
let typingBuffer = '';
let templates = [];

// Initialize
(async function init() {
    await loadTemplates();
    attachListeners();
})();

/**
 * Load templates from storage
 */
async function loadTemplates() {
    // For now, use chrome.storage. Will integrate with db.js later via messaging
    const result = await chrome.storage.local.get('templates_cache');
    templates = result.templates_cache || [];
}

/**
 * Attach event listeners to document
 */
function attachListeners() {
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleKeydown, true);
}

/**
 * Handle input events for trigger detection
 */
function handleInput(e) {
    const target = e.target;

    // Skip if not a text field
    if (!isTextField(target)) return;

    // Update buffer with latest character
    const value = getFieldValue(target);
    const lastChar = value[value.length - 1];

    if (lastChar) {
        typingBuffer += lastChar;
        if (typingBuffer.length > BUFFER_SIZE) {
            typingBuffer = typingBuffer.slice(-BUFFER_SIZE);
        }
    }

    // Check for trigger match
    checkForTrigger(target);
}

/**
 * Handle keydown for special keys (Space, Tab trigger expansion)
 */
function handleKeydown(e) {
    // Additional logic if needed for immediate expansion on space/tab
}

/**
 * Check if buffer matches any trigger
 */
function checkForTrigger(target) {
    for (const template of templates) {
        if (typingBuffer.endsWith(template.trigger)) {
            expandTemplate(target, template);
            typingBuffer = ''; // Clear buffer
            break;
        }
    }
}

/**
 * Expand template into the field
 */
function expandTemplate(target, template) {
    const value = getFieldValue(target);
    const triggerLength = template.trigger.length;

    // Remove trigger from field
    const newValue = value.slice(0, -triggerLength) + template.content.replace(/<br>/g, '\n');
    setFieldValue(target, newValue);

    // Update usage stats
    template.usageCount++;
    // TODO: Sync back to storage
}

/**
 * Check if element is a text field
 */
function isTextField(element) {
    if (!element) return false;

    const tagName = element.tagName?.toLowerCase();
    if (tagName === 'textarea') return true;
    if (tagName === 'input') {
        const type = element.type?.toLowerCase();
        return ['text', 'email', 'search', 'url', 'tel'].includes(type);
    }
    if (element.isContentEditable) return true;

    return false;
}

/**
 * Get value from various field types
 */
function getFieldValue(element) {
    if (element.isContentEditable) {
        return element.innerText || '';
    }
    return element.value || '';
}

/**
 * Set value to various field types
 */
function setFieldValue(element, value) {
    if (element.isContentEditable) {
        element.innerText = value;
    } else {
        element.value = value;
    }

    // Trigger events for frameworks
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Listen for template updates from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'RELOAD_TEMPLATES') {
        loadTemplates();
    }
});
