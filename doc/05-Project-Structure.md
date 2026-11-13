> [← 返回文档目录](../README.md) ｜ 本分册由 `README.md` 的「Project Structure」章节拆分而来。

## Project Structure

```
web-reminder/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Background service worker
├── content.js            # Content script for DOM monitoring
├── popup.html            # Settings popup interface
├── popup.js              # Popup logic
├── icons/                # Extension icons
│   ├── icon16.png       # 16x16 icon
│   ├── icon48.png       # 48x48 icon
│   ├── icon128.png      # 128x128 icon
│   └── generate_icons.py # Icon generation script
└── README.md             # This file
```
