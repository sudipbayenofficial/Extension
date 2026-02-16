// Image Editor with annotation tools
let imageCanvas, drawingCanvas, imageCtx, drawingCtx;
let currentTool = 'pen';
let currentColor = '#ef4444';
let lineWidth = 4;
let isDrawing = false;
let startX, startY;
let history = [];
let historyStep = -1;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    imageCanvas = document.getElementById('imageCanvas');
    drawingCanvas = document.getElementById('drawingCanvas');
    imageCtx = imageCanvas.getContext('2d');
    drawingCtx = drawingCanvas.getContext('2d');

    // Load the screenshot
    chrome.storage.local.get(['tempScreenshot'], (result) => {
        if (result.tempScreenshot) {
            loadImage(result.tempScreenshot);
            // Clear temporary storage
            chrome.storage.local.remove(['tempScreenshot']);
        }
    });

    setupToolbar();
    setupCanvas();
    setupKeyboardShortcuts();
});

/**
 * Load image onto canvas
 */
function loadImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
        // Set canvas size to image size
        imageCanvas.width = img.width;
        imageCanvas.height = img.height;
        drawingCanvas.width = img.width;
        drawingCanvas.height = img.height;

        // Draw image
        imageCtx.drawImage(img, 0, 0);

        // Center canvases
        const container = document.getElementById('canvasContainer');
        const containerRect = container.getBoundingClientRect();
        const canvasLeft = (containerRect.width - img.width) / 2;
        const canvasTop = (containerRect.height - img.height) / 2;

        imageCanvas.style.left = Math.max(0, canvasLeft) + 'px';
        imageCanvas.style.top = Math.max(0, canvasTop) + 'px';
        drawingCanvas.style.left = Math.max(0, canvasLeft) + 'px';
        drawingCanvas.style.top = Math.max(0, canvasTop) + 'px';

        saveState();
    };
    img.src = dataUrl;
}

/**
 * Setup toolbar event listeners
 */
function setupToolbar() {
    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
        });
    });

    // Color picker
    document.getElementById('colorPicker').addEventListener('change', (e) => {
        currentColor = e.target.value;
    });

    // Line width
    document.getElementById('lineWidth').addEventListener('change', (e) => {
        lineWidth = parseInt(e.target.value);
    });

    // Action buttons
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('clearBtn').addEventListener('click', clearAnnotations);
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('saveBtn').addEventListener('click', saveImage);
}

/**
 * Setup canvas drawing
 */
function setupCanvas() {
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseout', stopDrawing);
}

/**
 * Drawing functions
 */
function startDrawing(e) {
    isDrawing = true;
    const rect = drawingCanvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    if (currentTool === 'text') {
        placeTextInput(startX, startY);
        isDrawing = false;
    }
}

function draw(e) {
    if (!isDrawing) return;

    const rect = drawingCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    drawingCtx.strokeStyle = currentColor;
    drawingCtx.lineWidth = lineWidth;
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';

    if (currentTool === 'pen') {
        drawingCtx.beginPath();
        drawingCtx.moveTo(startX, startY);
        drawingCtx.lineTo(currentX, currentY);
        drawingCtx.stroke();
        startX = currentX;
        startY = currentY;
    } else if (currentTool === 'highlighter') {
        drawingCtx.globalAlpha = 0.3;
        drawingCtx.lineWidth = lineWidth * 3;
        drawingCtx.beginPath();
        drawingCtx.moveTo(startX, startY);
        drawingCtx.lineTo(currentX, currentY);
        drawingCtx.stroke();
        drawingCtx.globalAlpha = 1.0;
        startX = currentX;
        startY = currentY;
    }
}

function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;

    const rect = drawingCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    if (currentTool === 'arrow') {
        drawArrow(startX, startY, endX, endY);
    } else if (currentTool === 'rectangle') {
        drawRectangle(startX, startY, endX, endY);
    } else if (currentTool === 'circle') {
        drawCircle(startX, startY, endX, endY);
    } else if (currentTool === 'blur') {
        applyBlur(startX, startY, endX, endY);
    }

    saveState();
}

/**
 * Shape drawing functions
 */
function drawArrow(x1, y1, x2, y2) {
    const headLength = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    drawingCtx.strokeStyle = currentColor;
    drawingCtx.lineWidth = lineWidth;
    drawingCtx.fillStyle = currentColor;

    // Line
    drawingCtx.beginPath();
    drawingCtx.moveTo(x1, y1);
    drawingCtx.lineTo(x2, y2);
    drawingCtx.stroke();

    // Arrowhead
    drawingCtx.beginPath();
    drawingCtx.moveTo(x2, y2);
    drawingCtx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    drawingCtx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    drawingCtx.closePath();
    drawingCtx.fill();
}

function drawRectangle(x1, y1, x2, y2) {
    drawingCtx.strokeStyle = currentColor;
    drawingCtx.lineWidth = lineWidth;
    drawingCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
}

function drawCircle(x1, y1, x2, y2) {
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    drawingCtx.strokeStyle = currentColor;
    drawingCtx.lineWidth = lineWidth;
    drawingCtx.beginPath();
    drawingCtx.arc(x1, y1, radius, 0, 2 * Math.PI);
    drawingCtx.stroke();
}

function applyBlur(x1, y1, x2, y2) {
    // Get the region
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);

    // Apply pixelation effect (simpler than actual blur)
    const imageData = drawingCtx.getImageData(x, y, width, height);
    const pixelSize = 10;

    for (let py = 0; py < height; py += pixelSize) {
        for (let px = 0; px < width; px += pixelSize) {
            const i = (py * width + px) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];

            // Fill the block
            for (let dy = 0; dy < pixelSize && py + dy < height; dy++) {
                for (let dx = 0; dx < pixelSize && px + dx < width; dx++) {
                    const di = ((py + dy) * width + (px + dx)) * 4;
                    imageData.data[di] = r;
                    imageData.data[di + 1] = g;
                    imageData.data[di + 2] = b;
                }
            }
        }
    }

    drawingCtx.putImageData(imageData, x, y);
}

/**
 * Text input
 */
function placeTextInput(x, y) {
    const textInput = document.getElementById('textInput');
    const rect = drawingCanvas.getBoundingClientRect();

    textInput.style.left = (rect.left + x) + 'px';
    textInput.style.top = (rect.top + y) + 'px';
    textInput.style.display = 'block';
    textInput.value = '';
    textInput.focus();

    textInput.onblur = () => {
        if (textInput.value.trim()) {
            drawingCtx.font = `${lineWidth * 5}px Arial`;
            drawingCtx.fillStyle = currentColor;
            drawingCtx.fillText(textInput.value, x, y);
            saveState();
        }
        textInput.style.display = 'none';
    };

    textInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            textInput.blur();
        }
    };
}

/**
 * History management
 */
function saveState() {
    historyStep++;
    if (historyStep < history.length) {
        history.length = historyStep;
    }
    history.push(drawingCanvas.toDataURL());
    updateUndoRedoButtons();
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        restoreState();
    }
}

function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        restoreState();
    }
}

function restoreState() {
    const img = new Image();
    img.onload = () => {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        drawingCtx.drawImage(img, 0, 0);
        updateUndoRedoButtons();
    };
    img.src = history[historyStep];
}

function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = historyStep <= 0;
    document.getElementById('redoBtn').disabled = historyStep >= history.length - 1;
}

function clearAnnotations() {
    if (confirm('Clear all annotations?')) {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        saveState();
    }
}

/**
 * Export functions
 */
async function copyToClipboard() {
    const finalCanvas = mergeCanvases();
    finalCanvas.toBlob(async (blob) => {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
    });
}

async function saveImage() {
    const finalCanvas = mergeCanvases();

    // Get settings for filename and format
    chrome.runtime.sendMessage({ action: 'get_settings' }, (response) => {
        const settings = response?.settings || {};
        const format = settings.defaultFormat || 'png';
        const quality = settings.imageQuality || 1.0;

        const dataUrl = finalCanvas.toDataURL(`image/${format}`, quality);

        chrome.runtime.sendMessage({
            action: 'download',
            dataUrl: dataUrl,
            settings: settings
        });

        showToast('Screenshot saved!', 'success');

        // Close editor after a brief delay
        setTimeout(() => {
            window.close();
        }, 1500);
    });
}

function mergeCanvases() {
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = imageCanvas.width;
    finalCanvas.height = imageCanvas.height;
    const finalCtx = finalCanvas.getContext('2d');

    finalCtx.drawImage(imageCanvas, 0, 0);
    finalCtx.drawImage(drawingCanvas, 0, 0);

    return finalCanvas;
}

/**
 * Keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('textInput').style.display === 'block') return;

        // Tool shortcuts
        if (e.key === 'p') selectTool('pen');
        else if (e.key === 'h') selectTool('highlighter');
        else if (e.key === 'a') selectTool('arrow');
        else if (e.key === 'r') selectTool('rectangle');
        else if (e.key === 'c') selectTool('circle');
        else if (e.key === 't') selectTool('text');
        else if (e.key === 'b') selectTool('blur');

        // Actions
        else if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        } else if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveImage();
        }
    });
}

function selectTool(tool) {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tool === tool) {
            btn.classList.add('active');
        }
    });
    currentTool = tool;
}

/**
 * Toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'editor-toast';
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
