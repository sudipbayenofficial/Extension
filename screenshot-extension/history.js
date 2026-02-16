// Screenshot history page
document.addEventListener('DOMContentLoaded', loadHistory);

let screenshots = [];

function loadHistory() {
    chrome.storage.local.get(['screenshotHistory'], (result) => {
        screenshots = result.screenshotHistory || [];
        renderGallery();
    });

    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('previewModal').addEventListener('click', (e) => {
        if (e.target.id === 'previewModal') {
            closeModal();
        }
    });
}

function renderGallery() {
    const gallery = document.getElementById('galleryContainer');
    const emptyState = document.getElementById('emptyState');

    if (screenshots.length === 0) {
        gallery.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    gallery.style.display = 'grid';
    emptyState.style.display = 'none';
    gallery.innerHTML = '';

    screenshots.forEach((screenshot, index) => {
        const card = createScreenshotCard(screenshot, index);
        gallery.appendChild(card);
    });
}

function createScreenshotCard(screenshot, index) {
    const card = document.createElement('div');
    card.className = 'screenshot-card';

    const date = new Date(screenshot.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    card.innerHTML = `
        <img src="${screenshot.dataUrl}" class="screenshot-preview" alt="${screenshot.filename}">
        <div class="screenshot-info">
            <div class="screenshot-filename" title="${screenshot.filename}">${screenshot.filename}</div>
            <div class="screenshot-date">${formattedDate}</div>
            <div class="screenshot-actions">
                <button class="action-download" data-index="${index}">⬇️ Download</button>
                <button class="action-delete" data-index="${index}">🗑️ Delete</button>
            </div>
        </div>
    `;

    // Preview on image click
    card.querySelector('.screenshot-preview').addEventListener('click', () => {
        openPreview(screenshot.dataUrl);
    });

    // Download button
    card.querySelector('.action-download').addEventListener('click', (e) => {
        e.stopPropagation();
        downloadScreenshot(screenshot);
    });

    // Delete button
    card.querySelector('.action-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteScreenshot(index);
    });

    return card;
}

function openPreview(dataUrl) {
    document.getElementById('modalImage').src = dataUrl;
    document.getElementById('previewModal').classList.add('active');
}

function closeModal() {
    document.getElementById('previewModal').classList.remove('active');
}

function downloadScreenshot(screenshot) {
    chrome.downloads.download({
        url: screenshot.dataUrl,
        filename: screenshot.filename,
        saveAs: true
    });
}

function deleteScreenshot(index) {
    if (confirm('Delete this screenshot?')) {
        screenshots.splice(index, 1);
        chrome.storage.local.set({ screenshotHistory: screenshots }, () => {
            renderGallery();
        });
    }
}

function clearAll() {
    if (confirm('Delete all screenshots? This cannot be undone.')) {
        screenshots = [];
        chrome.storage.local.set({ screenshotHistory: [] }, () => {
            renderGallery();
        });
    }
}
