chrome.storage.local.get('screenshotData', async (data) => {
    const sData = data.screenshotData;
    if (!sData) return;

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const loading = document.getElementById('loading');
    
    try {
        if (sData.type === 'visible') {
            const img = await loadImage(sData.image);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        } else if (sData.type === 'partial') {
            const img = await loadImage(sData.image);
            const area = sData.area;
            
            // Validate bounds
            const x = Math.max(0, area.x);
            const y = Math.max(0, area.y);
            const w = Math.min(area.width, img.width - x);
            const h = Math.min(area.height, img.height - y);
            
            if (w > 0 && h > 0) {
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
            } else {
                console.error('Invalid crop area');
            }
        } else if (sData.type === 'full') {
            const dpr = sData.pixelRatio || 1;
            const segments = sData.segments;
            
            if (segments && segments.length > 0) {
                const firstImg = await loadImage(segments[0].image);
                canvas.width = firstImg.width;
                canvas.height = sData.totalHeight * dpr;
                
                ctx.drawImage(firstImg, 0, segments[0].y * dpr);
                
                for (let i = 1; i < segments.length; i++) {
                    const img = await loadImage(segments[i].image);
                    ctx.drawImage(img, 0, segments[i].y * dpr);
                }
            }
        }
        
        loading.style.display = 'none';
        canvas.style.display = 'block';
    } catch (e) {
        console.error('Error processing image:', e);
        loading.textContent = 'Error processing image.';
    }
});

document.getElementById('download-btn').addEventListener('click', () => {
    const canvas = document.getElementById('canvas');
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `screenshot-${timestamp}.png`;
    link.href = canvas.toDataURL();
    link.click();
});

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
