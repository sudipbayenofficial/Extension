/**
 * Popup Logic - TextExpander Pro
 */

document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    await db.seed();
    loadTemplates();
    setupListeners();
});

/**
 * Load and render templates
 */
async function loadTemplates() {
    const templates = await db.getAll('templates');
    const templateList = document.getElementById('templateList');
    templateList.innerHTML = '';

    if (templates.length === 0) {
        templateList.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">No templates yet. Create your first one!</p>';
        return;
    }

    templates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.innerHTML = `
            <div class="template-trigger">${template.trigger}</div>
            <div class="template-title">${template.title}</div>
            <div class="template-preview">${stripHtml(template.content)}</div>
        `;
        item.addEventListener('click', () => editTemplate(template.id));
        templateList.appendChild(item);
    });

    // Sync templates to content script
    syncTemplates(templates);
}

/**
 * Sync templates to content script via storage
 */
async function syncTemplates(templates) {
    await chrome.storage.local.set({ templates_cache: templates });

    // Notify all tabs to reload templates
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'RELOAD_TEMPLATES' }).catch(() => {
            // Tab might not have content script
        });
    });
}

/**
 * Setup event listeners
 */
function setupListeners() {
    document.getElementById('settingsBtn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
    });

    document.getElementById('newTemplateBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterTemplates(e.target.value);
    });
}

/**
 * Filter templates by search query
 */
async function filterTemplates(query) {
    const templates = await db.getAll('templates');
    const filtered = templates.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.trigger.toLowerCase().includes(query.toLowerCase()) ||
        t.content.toLowerCase().includes(query.toLowerCase())
    );

    const templateList = document.getElementById('templateList');
    templateList.innerHTML = '';

    filtered.forEach(template => {
        const item = document.createElement('div');
        item.className = 'template-item';
        item.innerHTML = `
            <div class="template-trigger">${template.trigger}</div>
            <div class="template-title">${template.title}</div>
            <div class="template-preview">${stripHtml(template.content)}</div>
        `;
        item.addEventListener('click', () => editTemplate(template.id));
        templateList.appendChild(item);
    });
}

/**
 * Edit template (opens options page)
 */
function editTemplate(id) {
    chrome.runtime.openOptionsPage();
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}
