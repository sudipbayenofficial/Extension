// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture_partial') {
    startSelection();
    // Return true not needed unless async response
  } else if (request.action === 'get_scroll_info') {
    const body = document.body;
    const html = document.documentElement;
    const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    sendResponse({
      width: window.innerWidth,
      height: height,
      windowHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    });
  } else if (request.action === 'set_scroll') {
    // Force instant scrolling
    document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
    if (document.body) {
      document.body.style.setProperty('scroll-behavior', 'auto', 'important');
    }
    window.scrollTo(0, request.y);
    setTimeout(() => {
        sendResponse({status: 'scrolled', y: window.scrollY});
    }, 200); // Slight delay for rendering
    return true; // Keep channel open for async response
  }
});

function startSelection() {
    if (document.getElementById('screenshot-overlay-container')) return;

    const overlay = document.createElement('div');
    overlay.id = 'screenshot-overlay-container';
    
    const selection = document.createElement('div');
    selection.id = 'screenshot-selection-box';
    overlay.appendChild(selection);
    
    document.body.appendChild(overlay);
    
    let startX, startY;
    let isSelecting = false;
    
    const onMouseDown = (e) => {
        e.preventDefault();
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        selection.style.left = startX + 'px';
        selection.style.top = startY + 'px';
        selection.style.width = '0px';
        selection.style.height = '0px';
        selection.style.display = 'block';
    };
    
    const onMouseMove = (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(currentX, startX);
        const top = Math.min(currentY, startY);
        
        selection.style.left = left + 'px';
        selection.style.top = top + 'px';
        selection.style.width = width + 'px';
        selection.style.height = height + 'px';
    };
    
    const onMouseUp = (e) => {
        if (!isSelecting) return;
        isSelecting = false;
        
        const rect = selection.getBoundingClientRect();
        
        // Remove overlay
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        
        if (rect.width > 0 && rect.height > 0) {
            const dpr = window.devicePixelRatio || 1;
            // Wait for render to clear the overlay
            requestAnimationFrame(() => {
                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        action: 'process_partial',
                        area: {
                            x: rect.left * dpr,
                            y: rect.top * dpr,
                            width: rect.width * dpr,
                            height: rect.height * dpr
                        }
                    });
                }, 50);
            });
        }
    };
    
    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
    
    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
             if (overlay.parentNode) {
                 overlay.parentNode.removeChild(overlay);
             }
             document.removeEventListener('keydown', onKeyDown);
        }
    };
    document.addEventListener('keydown', onKeyDown);
}
