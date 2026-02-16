/**
 * Content Script - Template Manager Pro
 * Handles text insertion into active inputs/textareas and contenteditable elements.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "INSERT_TEXT") {
        insertTemplate(request.text);
        sendResponse({ success: true });
    }
    else if (request.action === "OPEN_QUICK_SAVE") {
        showQuickSaveModal(request.text, request.categories);
    }
    return true;
});

function insertTemplate(content) {
    const activeEl = document.activeElement;

    if (!activeEl) {
        console.warn("No active element found to insert text.");
        return;
    }

    // Detect if content is HTML (Rich Text)
    const isRichContent = /<[a-z][\s\S]*>/i.test(content);

    // 1. Standard Input / Textarea (Plain Text Only)
    if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
        const plainText = isRichContent ? stripHtml(content) : content;
        insertIntoField(activeEl, plainText);
    }
    // 2. ContentEditable (Supports HTML)
    else if (activeEl.isContentEditable || document.designMode === 'on') {
        if (isRichContent) {
            insertHtmlIntoContentEditable(activeEl, content);
        } else {
            insertIntoContentEditable(activeEl, content);
        }
    }
    // 3. Iframe fallback
    else if (activeEl.tagName === 'IFRAME') {
        try {
            const innerDoc = activeEl.contentDocument || activeEl.contentWindow.document;
            if (innerDoc && innerDoc.activeElement) {
                console.log("Iframe detected - ensure extension permissions allow frame access.");
            }
        } catch (e) { /* Ignore */ }
    }
}

function stripHtml(html) {
    let text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<li>/gi, '• '); // Bullet points

    const tmp = document.createElement("DIV");
    tmp.innerHTML = text;
    return tmp.textContent || tmp.innerText || "";
}

function insertHtmlIntoContentEditable(element, html) {
    if (document.queryCommandSupported('insertHTML')) {
        document.execCommand('insertHTML', false, html);
    } else {
        insertIntoContentEditable(element, stripHtml(html));
    }
}

function insertIntoField(field, text) {
    const start = field.selectionStart || 0;
    const end = field.selectionEnd || 0;

    const value = field.value;
    const before = value.substring(0, start);
    const after = value.substring(end);

    field.value = before + text + after;

    const newPos = start + text.length;
    field.selectionStart = newPos;
    field.selectionEnd = newPos;

    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
}

function insertIntoContentEditable(element, text) {
    if (document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, text);
    } else {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}

// --- QUICK SAVE MODAL (Shadow DOM) ---
function showQuickSaveModal(text, categories) {
    const existing = document.getElementById('tmp-save-host');
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = 'tmp-save-host';
    host.style.cssText = 'position:fixed; top:20px; right:20px; z-index:2147483647;';

    const shadow = host.attachShadow({ mode: 'open' });

    const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    shadow.innerHTML = `
    <style>
        .modal {
            background: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            width: 300px;
            font-family: system-ui, sans-serif;
            border: 1px solid #e5e7eb;
            color: #1f2937;
        }
        h3 { margin: 0 0 12px 0; font-size: 16px; color: #4F46E5; }
        label { display: block; font-size: 12px; margin-bottom: 4px; font-weight: 500; }
        input, select, textarea {
            width: 100%; box-sizing: border-box;
            border: 1px solid #d1d5db; border-radius: 4px;
            padding: 8px; margin-bottom: 12px;
            font-size: 13px; font-family: inherit;
        }
        .actions { display: flex; justify-content: flex-end; gap: 8px; }
        button {
            border: none; padding: 6px 12px; border-radius: 4px;
            cursor: pointer; font-size: 12px; font-weight: 500;
        }
        .cancel { background: white; border: 1px solid #d1d5db; }
        .save { background: #4F46E5; color: white; }
        .save:hover { background: #4338ca; }
    </style>
    <div class="modal">
        <h3>Save Selection</h3>
        <label>Title</label>
        <input type="text" id="tmplTitle" placeholder="Template Name" autofocus value="${text.substring(0, 20)}...">
        
        <label>Category</label>
        <select id="tmplCat">${catOptions}</select>
        
        <label>Content</label>
        <textarea id="tmplContent" rows="3">${text}</textarea>

        <div class="actions">
            <button id="btnCancel" class="cancel">Cancel</button>
            <button id="btnSave" class="save">Save Template</button>
        </div>
    </div>
    `;

    document.body.appendChild(host);

    const btnSave = shadow.getElementById('btnSave');
    const btnCancel = shadow.getElementById('btnCancel');

    btnCancel.addEventListener('click', () => host.remove());

    btnSave.addEventListener('click', () => {
        const title = shadow.getElementById('tmplTitle').value;
        if (!title) {
            shadow.getElementById('tmplTitle').style.borderColor = 'red';
            return;
        }

        const data = {
            id: crypto.randomUUID(),
            title: title,
            content: shadow.getElementById('tmplContent').value,
            category: shadow.getElementById('tmplCat').value,
            favorite: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            usageCount: 0
        };

        chrome.runtime.sendMessage({
            action: 'SAVE_TEMPLATE_FROM_CONTENT',
            data: data
        }, (response) => {
            if (response && response.success) {
                btnSave.textContent = 'Saved!';
                btnSave.style.background = '#10b981';
                setTimeout(() => host.remove(), 1000);
            } else {
                alert('Failed to save: ' + (response.error || 'Unknown error'));
            }
        });
    });
}

// --- FLOATING TRIGGER (UX Enhancement) ---
let floatingBtn = null;

document.addEventListener('mouseup', (e) => {
    // 1. Wait a tick to ensure selection is finalized
    setTimeout(() => {
        // If we clicked the button itself, don't remove it, let the click handler run
        if (floatingBtn && (e.target === floatingBtn || floatingBtn.shadowRoot.contains(e.target))) {
            return;
        }

        const selection = window.getSelection();
        const text = selection.toString().trim();

        // Remove existing button if any
        if (floatingBtn) {
            floatingBtn.remove();
            floatingBtn = null;
        }

        // If selection is empty or user clicked inside the modal, ignore
        if (!text || (e.target.shadowRoot && e.target.id === 'tmp-save-host')) return;

        // Show Button
        showFloatingButton(selection);
    }, 10);
});

document.addEventListener('mousedown', (e) => {
    if (floatingBtn && !floatingBtn.contains(e.target)) {
        floatingBtn.remove();
        floatingBtn = null;
    }
});

function showFloatingButton(selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const text = selection.toString().trim(); // Capture immediately

    // Create host for Shadow DOM
    floatingBtn = document.createElement('div');
    // ... (styles same)
    floatingBtn.style.cssText = `
        position: absolute;
        left: ${rect.left + window.scrollX + rect.width}px;
        top: ${rect.top + window.scrollY - 30}px;
        z-index: 2147483646;
        cursor: pointer;
    `;

    const shadow = floatingBtn.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
        <style>
            button {
                background: #4F46E5;
                color: white;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.1s;
                font-weight: bold;
                padding-bottom: 2px;
            }
            button:hover { transform: scale(1.1); background: #4338ca; }
        </style>
        <button title="Save as Template">+</button>
    `;

    shadow.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Fetch Categories then Open Modal using captured text
        chrome.runtime.sendMessage({ action: 'GET_CATEGORIES' }, (response) => {
            showQuickSaveModal(text, response.categories || []);
        });

        floatingBtn.remove();
        floatingBtn = null;
    });

    document.body.appendChild(floatingBtn);
}
