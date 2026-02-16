# TextExpander Pro

A powerful, production-ready Chrome extension for smart text expansion with templates, shortcuts, and automation. Eliminate repetitive typing and boost your productivity across all websites.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🚀 Core Functionality
- **Text Expansion Engine**: Type shortcuts like `;br` and auto-expand to full templates
- **Works Everywhere**: Seamless integration with any text field on any website
- **Real-time Detection**: Instant trigger recognition with buffer-based matching
- **Smart Insertion**: Preserves cursor position and native input behavior

### 📝 Template Management
- **Rich Text Support**: Bold, italic, lists, links, and formatting
- **Unlimited Templates**: Create as many templates as you need
- **Full CRUD Operations**: Create, edit, delete, and organize templates
- **Quick Search**: Fuzzy search to find templates instantly
- **Usage Statistics**: Track how often you use each template

### 📁 Organization
- **Custom Folders**: Create color-coded folders to organize templates
- **Tags System**: Add tags for flexible categorization
- **Folder Filtering**: Quickly view templates by folder
- **Template Counts**: See how many templates are in each folder

### 🎨 Modern UI
- **Cyber Glass Theme**: Beautiful dark mode with neon accents and glassmorphism
- **Fullscreen Editor**: Immersive template creation experience
- **Responsive Design**: Works perfectly on all screen sizes
- **Smooth Animations**: Polished micro-interactions throughout

### 🔒 Privacy & Security
- **Offline-First**: All data stored locally in IndexedDB
- **No Tracking**: Zero analytics or data collection
- **No External Requests**: Completely self-contained
- **GDPR Friendly**: Your data never leaves your computer

## 📦 Installation

### From Source (Developer Mode)

1. **Download the Extension**
   ```bash
   git clone <repository-url>
   cd TextExpanderPro
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked"
   - Select the `TextExpanderPro` folder

3. **Start Using**
   - Click the extension icon in your toolbar
   - Click "Options" to start creating templates

## 🎯 Quick Start Guide

### Creating Your First Template

1. Click the extension icon and select **"Options"**
2. Click **"+ New Template"**
3. Fill in the form:
   - **Trigger**: `;br` (the shortcut you'll type)
   - **Title**: "Best Regards"
   - **Content**: "Best regards,\nYour Name"
4. Click **"Save Template"**

### Using Templates

1. Go to any website with a text field
2. Type your trigger: `;br`
3. Watch it auto-expand to your template! ✨

### Organizing with Folders

1. Go to **Options** → **Folders** tab
2. Click **"+ New Folder"**
3. Name it (e.g., "Work Emails") and pick a color
4. When creating templates, select your folder from the dropdown

## 🛠️ Technical Architecture

### Project Structure
```
TextExpanderPro/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for context menus
├── content.js             # Text expansion engine
├── lib/
│   └── db.js             # IndexedDB wrapper
├── popup/
│   ├── popup.html        # Quick access interface
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup logic
└── options/
    ├── options.html      # Template management UI
    ├── options.css       # Options page styles
    └── options.js        # Options page logic
```

### Technology Stack
- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No dependencies, pure performance
- **IndexedDB**: Local database for template storage
- **CSS Grid/Flexbox**: Modern, responsive layouts

### Key Components

**Text Expansion Engine (`content.js`)**
- Detects user typing in real-time
- Maintains a rolling buffer of recent characters
- Matches triggers against template database
- Replaces text while maintaining cursor position

**Template Storage (`lib/db.js`)**
- IndexedDB wrapper for CRUD operations
- Handles templates and folders
- Automatic data seeding on first install

**UI Components**
- **Popup**: Quick template access and search
- **Options**: Full template editor with grid layout
- **Modals**: Fullscreen template creation, compact folder creation

## 🎨 Customization

### Triggers
You can use any trigger format:
- `;shortcut` (recommended)
- `/command`
- `::abbreviation`

### Template Content
- Plain text
- Line breaks (`\n`)
- HTML formatting (for rich text fields)

## 🔧 Configuration

The extension works out of the box with sensible defaults:
- **Trigger Prefix**: `;` (customizable in code)
- **Buffer Size**: 20 characters
- **Storage**: IndexedDB (unlimited)

## 📊 Storage

Templates are stored locally using IndexedDB with this schema:

**Template Object**
```javascript
{
  id: "uuid",
  trigger: ";br",
  title: "Best Regards",
  content: "Best regards,\nYour Name",
  folder: "default",
  tags: ["email", "signature"],
  favorite: false,
  usageCount: 0,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Folder Object**
```javascript
{
  id: "uuid",
  name: "Work Emails",
  color: "#8b5cf6"
}
```

## 🚀 Performance

- **Lightweight**: < 100KB total size
- **Fast**: No noticeable input lag
- **Efficient**: Minimal memory footprint
- **Scalable**: Handles thousands of templates

## 🌟 Roadmap

Future features under consideration:
- [ ] Placeholder variables (`{{name}}`, `{{date}}`)
- [ ] Formula support for dynamic content
- [ ] Import/Export templates (JSON, CSV)
- [ ] Keyboard shortcuts for quick insert
- [ ] Cloud sync (optional)
- [ ] Template sharing
- [ ] Statistics dashboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Created By: Sudip Bayen**

Version: 1.0.0

---

**Need Help?** Open an issue or check the documentation in the Options page.

**Enjoy faster typing!** ⚡
