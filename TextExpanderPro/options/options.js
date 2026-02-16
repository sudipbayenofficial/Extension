/**
 * Options Page Logic - TextExpander Pro
 */

let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await db.init();
    await db.seed();
    loadTemplates();
    setupListeners();
});

/**
 * Setup event listeners
 */
function setupListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`${btn.dataset.view}-view`).classList.add('active');

            // Load folders when switching to folders view
            if (btn.dataset.view === 'folders') {
                loadFolders();
            }
        });
    });

    // New template button
    document.getElementById('newTemplateBtn').addEventListener('click', () => {
        editingId = null;
        openModal();
    });

    // New folder button
    document.getElementById('newFolderBtn').addEventListener('click', () => {
        editingFolderId = null;
        openFolderModal();
    });

    // Template modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Folder modal close buttons
    document.querySelectorAll('.folder-modal-close').forEach(btn => {
        btn.addEventListener('click', closeFolderModal);
    });

    // Form submissions
    document.getElementById('templateForm').addEventListener('submit', saveTemplate);
    document.getElementById('folderForm').addEventListener('submit', saveFolder);

    // Color picker
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('inputFolderColor').value = btn.dataset.color;
        });
    });

    // Search
    document.getElementById('searchTemplates').addEventListener('input', (e) => {
        filterTemplates(e.target.value);
    });
}

/**
 * Load and render templates
 */
async function loadTemplates() {
    const templates = await db.getAll('templates');
    renderTemplatesTable(templates);
}

/**
 * Render templates table
 */
function renderTemplatesTable(templates) {
    const tbody = document.getElementById('templatesTableBody');
    tbody.innerHTML = '';

    templates.forEach(template => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="trigger-badge">${template.trigger}</span></td>
            <td>${template.title}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${stripHtml(template.content)}</td>
            <td>
                <button class="action-btn edit-btn" data-id="${template.id}">✏️</button>
                <button class="action-btn delete-btn" data-id="${template.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editTemplate(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTemplate(btn.dataset.id));
    });
}

/**
 * Filter templates
 */
async function filterTemplates(query) {
    const templates = await db.getAll('templates');
    const filtered = templates.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.trigger.toLowerCase().includes(query.toLowerCase()) ||
        t.content.toLowerCase().includes(query.toLowerCase())
    );
    renderTemplatesTable(filtered);
}

/**
 * Open modal
 */
async function openModal() {
    await loadFolderOptions();
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modalTitle').textContent = editingId ? 'Edit Template' : 'New Template';
    document.getElementById('templateForm').reset();
    document.getElementById('editor').innerHTML = '';
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    editingId = null;
}

/**
 * Save template
 */
async function saveTemplate(e) {
    e.preventDefault();

    const tagsInput = document.getElementById('inputTags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];

    const template = {
        id: editingId || crypto.randomUUID(),
        trigger: document.getElementById('inputTrigger').value,
        title: document.getElementById('inputTitle').value,
        content: document.getElementById('editor').innerHTML || document.getElementById('editor').textContent,
        folder: document.getElementById('inputFolder').value,
        tags: tags,
        favorite: false,
        usageCount: editingId ? (await db.getById('templates', editingId))?.usageCount || 0 : 0,
        createdAt: editingId ? (await db.getById('templates', editingId))?.createdAt : Date.now(),
        updatedAt: Date.now()
    };

    await db.add('templates', template);
    closeModal();
    loadTemplates();
}

/**
 * Edit template
 */
async function editTemplate(id) {
    editingId = id;
    const template = await db.getById('templates', id);

    await openModal();

    document.getElementById('inputTrigger').value = template.trigger;
    document.getElementById('inputTitle').value = template.title;
    document.getElementById('inputFolder').value = template.folder || 'default';
    document.getElementById('inputTags').value = template.tags ? template.tags.join(', ') : '';
    document.getElementById('editor').innerHTML = template.content;
}

/**
 * Delete template
 */
async function deleteTemplate(id) {
    if (confirm('Delete this template?')) {
        await db.delete('templates', id);
        loadTemplates();
    }
}

/**
 * Strip HTML
 */
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

// --- FOLDER MANAGEMENT ---

let editingFolderId = null;

/**
 * Load folders
 */
async function loadFolders() {
    const folders = await db.getAll('folders');
    const templates = await db.getAll('templates');
    const foldersGrid = document.getElementById('foldersGrid');
    foldersGrid.innerHTML = '';

    folders.forEach(folder => {
        const count = templates.filter(t => t.folder === folder.id).length;
        const card = document.createElement('div');
        card.className = 'folder-card';
        card.style.borderLeft = `4px solid ${folder.color}`;
        card.innerHTML = `
            <div class="folder-icon">📁</div>
            <div class="folder-name">${folder.name}</div>
            <div class="folder-count">${count} template${count !== 1 ? 's' : ''}</div>
            <div class="folder-actions">
                <button class="action-btn edit-folder-btn" data-id="${folder.id}">✏️</button>
                ${folder.id !== 'default' ? `<button class="action-btn delete-folder-btn" data-id="${folder.id}">🗑️</button>` : ''}
            </div>
        `;
        foldersGrid.appendChild(card);
    });

    // Attach listeners
    document.querySelectorAll('.edit-folder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            editFolder(btn.dataset.id);
        });
    });

    document.querySelectorAll('.delete-folder-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFolder(btn.dataset.id);
        });
    });
}

/**
 * Open folder modal
 */
async function openFolderModal() {
    document.getElementById('folderModal').classList.remove('hidden');
    document.getElementById('folderModalTitle').textContent = editingFolderId ? 'Edit Folder' : 'New Folder';
    document.getElementById('folderForm').reset();
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('.color-btn').classList.add('selected');
    document.getElementById('inputFolderColor').value = '#8b5cf6';

    if (editingFolderId) {
        const folder = await db.getById('folders', editingFolderId);
        document.getElementById('inputFolderName').value = folder.name;
        document.getElementById('inputFolderColor').value = folder.color;
        document.querySelectorAll('.color-btn').forEach(btn => {
            if (btn.dataset.color === folder.color) {
                btn.classList.add('selected');
            }
        });
    }
}

/**
 * Close folder modal
 */
function closeFolderModal() {
    document.getElementById('folderModal').classList.add('hidden');
    editingFolderId = null;
}

/**
 * Save folder
 */
async function saveFolder(e) {
    e.preventDefault();

    const folder = {
        id: editingFolderId || crypto.randomUUID(),
        name: document.getElementById('inputFolderName').value,
        color: document.getElementById('inputFolderColor').value
    };

    await db.add('folders', folder);
    closeFolderModal();
    loadFolders();
    await loadFolderOptions();
}

/**
 * Edit folder
 */
async function editFolder(id) {
    editingFolderId = id;
    await openFolderModal();
}

/**
 * Delete folder
 */
async function deleteFolder(id) {
    if (confirm('Delete this folder? Templates will be moved to General.')) {
        // Move templates to default
        const templates = await db.getAll('templates');
        const affected = templates.filter(t => t.folder === id);
        for (const template of affected) {
            template.folder = 'default';
            await db.add('templates', template);
        }

        await db.delete('folders', id);
        loadFolders();
    }
}

/**
 * Load folder options for template form
 */
async function loadFolderOptions() {
    const folders = await db.getAll('folders');
    const select = document.getElementById('inputFolder');
    select.innerHTML = '';

    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        select.appendChild(option);
    });
}
