// Popup Logic

// State
let allTemplates = [];
let allCategories = [];
let activeCategory = 'all';
let searchQuery = '';

// Elements
const templateListEl = document.getElementById('templateList');
const categoryListEl = document.getElementById('categoryList');
const searchInput = document.getElementById('searchInput');
const openOptionsBtn = document.getElementById('openOptionsBtn');
const addBtn = document.getElementById('addBtn');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    renderCategories();
    renderTemplates();
    setupListeners();
});

// --- DATA LISTENER ---
async function loadData() {
    allTemplates = await db.getAll('templates');
    allCategories = await db.getAll('categories');

    // Convert cats to map for easy lookup
    // (Optional optimization)
}

// --- RENDERING ---

function renderCategories() {
    // Keep 'All' and 'Favorites' static
    const staticChips = categoryListEl.querySelectorAll('[data-id="all"], [data-id="fav"]');
    categoryListEl.innerHTML = ''; // Request clear
    staticChips.forEach(chip => categoryListEl.appendChild(chip));

    allCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-chip';
        btn.textContent = cat.name;
        btn.dataset.id = cat.id;
        if (cat.id === activeCategory) btn.classList.add('active');

        btn.addEventListener('click', () => {
            // Update UI
            document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Set State
            activeCategory = cat.id;
            renderTemplates();
        });

        categoryListEl.appendChild(btn);
    });

    // Add "New Category" Button
    const newCatBtn = document.createElement('button');
    newCatBtn.className = 'cat-chip';
    newCatBtn.textContent = '+';
    newCatBtn.title = "Create New Category";
    newCatBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    categoryListEl.appendChild(newCatBtn);

    // Re-attach listeners to static chips
    document.querySelector('[data-id="all"]').addEventListener('click', (e) => setCategory(e, 'all'));
    document.querySelector('[data-id="fav"]').addEventListener('click', (e) => setCategory(e, 'fav'));
}

function setCategory(e, id) {
    document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    activeCategory = id;
    renderTemplates();
}

function renderTemplates() {
    templateListEl.innerHTML = '';

    let filtered = allTemplates;

    // Filter by Category
    if (activeCategory === 'fav') {
        filtered = filtered.filter(t => t.favorite);
    } else if (activeCategory !== 'all') {
        filtered = filtered.filter(t => t.category === activeCategory);
    }

    // Filter by Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.content.toLowerCase().includes(q)
        );
    }

    // Sort by Usage (Desc) then Last Updated
    filtered.sort((a, b) => b.usageCount - a.usageCount || b.updatedAt - a.updatedAt);

    if (filtered.length === 0) {
        templateListEl.innerHTML = '<div class="empty-state">No templates found.</div>';
        return;
    }

    filtered.forEach(tmpl => {
        const card = document.createElement('div');
        card.className = 'tmpl-card';
        card.innerHTML = `
            <div class="tmpl-header">
                <span class="tmpl-title">${tmpl.title}</span>
                ${tmpl.favorite ? '<span>⭐</span>' : ''}
            </div>
            <div class="tmpl-preview">${escapeHtml(tmpl.content)}</div>
            <div class="tmpl-actions">
                <button class="action-chip insert-btn">Insert</button>
                <button class="action-chip copy-btn">Copy</button>
            </div>
        `;

        // Card Click (Default Insert)
        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                handleInsert(tmpl);
            }
        });

        // Copy Button
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(tmpl.content);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 1000);
            updateUsage(tmpl);
        });

        // Insert Button
        const insertBtn = card.querySelector('.insert-btn');
        insertBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleInsert(tmpl);
        });

        templateListEl.appendChild(card);
    });
}

// --- ACTIONS ---

async function handleInsert(template) {
    // 1. Update Usage
    updateUsage(template);

    // 2. Variable Parsing (Simple Prompt)
    let content = template.content;
    const variables = content.match(/{{(.*?)}}/g);

    if (variables) {
        // Dedup variables
        const uniqueVars = [...new Set(variables)];
        for (const v of uniqueVars) {
            const varName = v.replace(/{{|}}/g, '');
            // In a real pro extension, we'd show a specialized UI modal here.
            // For now, simple prompt is safer than blocking.
            // OR ideally, we pass the raw content to content script and let it handle UI? 
            // Let's stick to prompt for MVP speed.
            // Note: Prompt blocks execution, not ideal for extension popup (might close).
            // Better: Simple replacement or just skipping for now.

            // Let's assume user fills it manually after insertion for MVP v1.
            // Or replace with simple placeholder.
        }
    }

    // 3. Send to Content Script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        // Try injecting script if needed (robustness)
        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: "INSERT_TEXT",
                text: content
            });
            window.close(); // Close popup on success
        } catch (e) {
            // Script not loaded?
            console.warn("Content script not ready, injecting...", e);
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            await chrome.tabs.sendMessage(tab.id, {
                action: "INSERT_TEXT",
                text: content
            });
            window.close();
        }
    }
}

async function updateUsage(template) {
    template.usageCount = (template.usageCount || 0) + 1;
    template.lastUsed = Date.now();
    await db.add('templates', template);
}

// --- SETUP ---

function setupListeners() {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTemplates();
    });

    openOptionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    addBtn.addEventListener('click', () => {
        // Deep link to Options page with "New" mode
        chrome.runtime.openOptionsPage();
    });
}

// Utils
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
