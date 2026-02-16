# 📸 OmniCapture Pro

**Professional-grade browser extension for capturing and editing screenshots**

---

## ✨ Features

### Capture Modes
- 📜 **Full Page** - Auto-scroll and stitch entire webpage
- ✂️ **Select Area** - Draw custom selection rectangle
- 🖼️ **Visible Area** - Capture current viewport
- 🎯 **Element Capture** - Click any element to capture
- ⏱️ **Delayed Capture** - 3/5/10 second countdown

### Image Editor
- 🖊️ Pen, Highlighter, Shapes, Arrows
- 📝 Text annotations
- 🔲 Blur/pixelate sensitive areas
- ↶ Undo/Redo
- 💾 Save or 📋 Copy to clipboard

### Advanced Features
- ⚙️ Comprehensive settings page
- 📚 Screenshot history gallery
- ⌨️ Keyboard shortcuts
- 🎨 Multiple export formats (PNG/JPG/WebP)
- 🖱️ Context menu integration

---

## 🚀 Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select this folder: `screenshot-extension`
5. Extension icon will appear in toolbar

---

## ⌨️ Keyboard Shortcuts

- `Ctrl+Shift+S` - Capture full page
- `Ctrl+Shift+A` - Select area
- `Ctrl+Shift+V` - Capture visible area

**In Editor:**
- `P` - Pen tool
- `H` - Highlighter
- `A` - Arrow
- `R` - Rectangle
- `C` - Circle
- `T` - Text
- `B` - Blur
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+S` - Save

---

## 📖 Quick Start

1. **Click the extension icon** in your toolbar
2. **Choose a capture mode** (Full Page, Select Area, etc.)
3. **Editor opens automatically** with your screenshot
4. **Annotate** using the toolbar tools
5. **Save** or **Copy** to clipboard

---

## ⚙️ Settings

Access settings by clicking the ⚙️ icon in the popup or right-click the extension icon → Options.

### Configurable Options
- Scroll speed and delay
- Default image format and quality
- Filename template with variables
- Auto-open editor toggle
- Maximum history items

---

## 📚 History

View all captured screenshots:
- Click "📚 History" in the extension popup
- Preview, download, or delete screenshots
- Automatically manages storage limits

---

## 🛠️ Technical Details

- **Manifest Version:** 3
- **Permissions:** activeTab, downloads, storage, clipboardWrite, contextMenus
- **Browser Support:** Chrome, Edge (Chromium-based)

---

## 📄 File Structure

```
screenshot-extension/
├── manifest.json      # Extension configuration
├── background.js      # Service worker
├── content.js         # Page interaction
├── popup.html/js      # Extension popup
├── editor.html/js     # Image editor
├── settings.html/js   # Settings page
├── history.html/js    # History gallery
└── utils.js           # Shared utilities
```

---

## 🎯 Usage Tips

### Capture Long Webpages
Use **Full Page** mode to automatically scroll and capture entire articles.

### Capture Hover States
Use **Delayed Capture** to open dropdown menus or hover states before the screenshot.

### Element-Specific Screenshots
Use **Element Capture** to precisely capture specific components like images, tables, or sections.

### Annotate Screenshots
The editor automatically opens after capture. Use drawing tools, add text, or blur sensitive information before saving.

### Customize Filenames
In Settings, use template variables:
- `{date}` - Current date
- `{time}` - Current time
- `{timestamp}` - Unix timestamp
- `{domain}` - Website domain
- `{title}` - Page title

---

## 🐛 Troubleshooting

**Extension not capturing?**
- Ensure you're on a web page (not chrome:// pages)
- Reload the page and try again

**Editor not opening?**
- Check Settings → "Auto-open editor" is enabled

**Keyboard shortcuts not working?**
- Go to `chrome://extensions/shortcuts` to view/customize

---

## 📝 License

This is a custom-built browser extension. Use responsibly.

---

## 🎉 Enjoy OmniCapture Pro!

For support or feature requests, please consult the documentation or settings page.
