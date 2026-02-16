// Options Page Logic

let currentView = 'templates-view';
let editingId = null; // ID of item being edited
let activeType = 'template'; // 'template' or 'category'

// DOM
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const modal = document.getElementById('modalOverlay');
const modalForm = document.getElementById('modalForm');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    setupNav();
    await refreshTemplates();
    await refreshCategories();
    setupModals();
});

// --- NAVIGATION ---
function setupNav() {
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update Active State
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Switch View
            const viewId = btn.dataset.view;
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');
        });
    });
}

// --- TEMPLATES MANAGER ---

async function refreshTemplates() {
    const templates = await db.getAll('templates');
    const categories = await db.getAll('categories');

    // Populate Filter
    const filterSelect = document.getElementById('tmplCatFilter');
    filterSelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(c => {
        filterSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    // Populate Table
    const tbody = document.querySelector('#templatesTable tbody');
    tbody.innerHTML = '';

    // Simple Join (Category ID -> Name)
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c.name);

    templates.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${t.title}</strong>${t.favorite ? ' ⭐' : ''}</td>
            <td style="color: #666; font-size: 13px;">${t.content.substring(0, 60)}${t.content.length > 60 ? '...' : ''}</td>
            <td><span class="badg">${catMap[t.category] || 'Unknown'}</span></td>
            <td>
                <button class="icon-action edit-tmpl" data-id="${t.id}">✏️</button>
                <button class="icon-action delete delete-tmpl" data-id="${t.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach Listeners
    document.querySelectorAll('.edit-tmpl').forEach(b => b.addEventListener('click', (e) => openTemplateModal(e.target.dataset.id)));
    document.querySelectorAll('.delete-tmpl').forEach(b => b.addEventListener('click', (e) => deleteTemplate(e.target.dataset.id)));
}

async function deleteTemplate(id) {
    if (confirm("Delete this template?")) {
        await db.delete('templates', id);
        refreshTemplates();
    }
}

// --- CATEGORIES MANAGER ---

async function refreshCategories() {
    const categories = await db.getAll('categories');
    const tbody = document.querySelector('#categoriesTable tbody');
    tbody.innerHTML = '';

    categories.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.name}</td>
            <td><div style="width: 20px; height: 20px; background: ${c.color}; border-radius: 4px;"></div></td>
            <td>
                <button class="icon-action edit-cat" data-id="${c.id}">✏️</button>
                <button class="icon-action delete delete-cat" data-id="${c.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-cat').forEach(b => b.addEventListener('click', (e) => openCategoryModal(e.target.dataset.id)));
    document.querySelectorAll('.delete-cat').forEach(b => b.addEventListener('click', (e) => deleteCategory(e.target.dataset.id)));
}

async function deleteCategory(id) {
    if (confirm("Delete this category? Templates in this category may be orphaned.")) {
        await db.delete('categories', id);
        refreshCategories();
    }
}

// --- MODAL LOGIC ---

document.getElementById('newTemplateBtn').addEventListener('click', () => openTemplateModal());
document.getElementById('newCategoryBtn').addEventListener('click', () => openCategoryModal());

document.getElementById('modalCancel').addEventListener('click', () => modal.classList.add('hidden'));

document.getElementById('modalSave').addEventListener('click', async (e) => {
    e.preventDefault();
    const formData = new FormData(modalForm);

    if (activeType === 'template') {
        const editorContent = document.getElementById('editor-content');

        let existingItem = {};
        if (editingId) {
            try { existingItem = await db.getById('templates', editingId) || {}; } catch (e) { }
        }

        const item = {
            ...existingItem, // Merge existing fields (createdAt, usageCount, etc.)
            id: editingId || crypto.randomUUID(),
            title: modalForm.title.value,
            content: editorContent.innerHTML,
            category: modalForm.category.value,
            favorite: modalForm.favorite.checked,
            updatedAt: Date.now()
        };
        if (!editingId) {
            item.createdAt = Date.now();
            item.usageCount = 0;
        }

        await db.add('templates', item);
        refreshTemplates();
    }
    else if (activeType === 'category') {
        let existingItem = {};
        if (editingId) {
            try { existingItem = await db.getById('categories', editingId) || {}; } catch (e) { }
        }

        const item = {
            ...existingItem,
            id: editingId || crypto.randomUUID(),
            name: modalForm.catName.value,
            color: modalForm.color.value,
            createdAt: existingItem.createdAt || Date.now()
        };
        await db.add('categories', item);
        refreshCategories();
    }

    modal.classList.add('hidden');
});

async function openTemplateModal(id = null) {
    activeType = 'template';
    editingId = id;
    document.getElementById('modalTitle').textContent = id ? 'Edit Template' : 'New Template';

    // Build Form
    const categories = await db.getAll('categories');
    let item = id ? await db.getById('templates', id) : { title: '', content: '', category: categories[0]?.id || '', favorite: false };

    const catOptions = categories.map(c => `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${c.name}</option>`).join('');

    modalForm.innerHTML = `
        <div class="form-group">
            <label>Title</label>
            <input type="text" name="title" value="${item.title.replace(/"/g, '&quot;')}" required>
        </div>
        <div class="form-group">
            <label>Content (Rich Text)</label>
            <div class="editor-toolbar">
                <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
                <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
                <button type="button" data-cmd="insertUnorderedList" title="Bullet List">• List</button>
            </div>
            <div id="editor-content" class="rich-editor" contenteditable="true">${item.content}</div>
        </div>
        <div class="form-group">
            <label>Category</label>
            <select name="category">${catOptions}</select>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" name="favorite" ${item.favorite ? 'checked' : ''}> Mark as Favorite
            </label>
        </div>
`;
    modal.classList.remove('hidden');

    // Attach Editor Listeners
    modal.querySelectorAll('.editor-toolbar button').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent loss of focus
            const cmd = btn.dataset.cmd;
            document.execCommand(cmd, false, null);
        });
    });
}

async function openCategoryModal(id = null) {
    activeType = 'category';
    editingId = id;
    document.getElementById('modalTitle').textContent = id ? 'Edit Category' : 'New Category';

    let item = id ? await db.getById('categories', id) : { name: '', color: '#000000' };

    modalForm.innerHTML = `
        <div class="form-group">
            <label>Category Name</label>
            <input type="text" name="catName" value="${item.name}" required>
        </div>
        <div class="form-group">
            <label>Color Tag</label>
            <input type="color" name="color" value="${item.color}" style="height: 40px;">
        </div>
`;
    modal.classList.remove('hidden');
}

// --- IMPORT / EXPORT (Bonus) ---
document.getElementById('exportBtn').addEventListener('click', async () => {
    const data = {
        templates: await db.getAll('templates'),
        categories: await db.getAll('categories'),
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_manager_backup.json';
    a.click();
});
