# Web UI Change Detector - Chrome Extension

🔍 A Chrome extension that detects frontend UI changes and sends system notifications.

## Features

- **Real-time Monitoring**: Uses MutationObserver to detect DOM changes
- **System Notifications**: Sends native browser notifications when UI changes are detected
- **Configurable Settings**: Customize notification behavior (enable/disable, sound, interaction)
- **Statistics Tracking**: Tracks total changes detected and last change time
- **Smart Debouncing**: Prevents notification spam with built-in cooldown mechanisms
- **Click-to-Navigate**: Click notifications to jump to the changed tab

## Installation

### Method 1: Developer Mode (Recommended for Testing)

1. Open Chrome browser and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** in the top right corner
3. Click **"Load unpacked"**
4. Select the project root directory (`/workspace`)
5. The extension will be installed and active immediately

### Method 2: Install from CRX File

1. Open Chrome browser and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** in the top right corner
3. Click **"Pack extension"**
4. Enter the project root directory path
5. Click **"Pack extension"** button
6. Drag the generated `.crx` file onto the extensions page to install

## Usage

1. **Install the extension** using one of the methods above
2. **Click the extension icon** in the Chrome toolbar to open settings
3. **Configure notification preferences**:
   - Enable/Disable notifications
   - Toggle sound on/off
   - Require interaction (keep notification visible until clicked)
4. **Test notifications** using the "Test Notification" button
5. **Browse websites** - the extension will automatically detect UI changes and send notifications

## How It Works

### Content Script (`content.js`)
- Injected into all web pages
- Uses `MutationObserver` to monitor DOM changes
- Generates snapshots of page structure to detect significant changes
- Implements debouncing and cooldown to prevent notification spam
- Detects:
  - DOM element additions/removals
  - Class and style attribute changes
  - Page title changes

### Background Service Worker (`background.js`)
- Runs independently of web pages
- Receives change notifications from content scripts
- Manages notification settings and statistics
- Sends system notifications using Chrome Notifications API
- Handles notification click events (navigate to changed tab)

### Popup Interface (`popup.html` + `popup.js`)
- User interface for extension settings
- Displays statistics (total changes, last change time)
- Allows testing notifications
- Real-time settings synchronization

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

## Permissions

The extension requires the following permissions:
- `storage`: Save settings and statistics
- `notifications`: Send system notifications
- `tabs`: Navigate to changed tabs
- `<all_urls>`: Monitor UI changes on all websites

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| Enable Notifications | Turn notifications on/off | ✅ On |
| Sound | Play sound with notifications | ✅ On |
| Require Interaction | Keep notification visible until clicked | ❌ Off |

## Troubleshooting

### Notifications not appearing
1. Check if notifications are enabled in the extension popup
2. Ensure Chrome has permission to send notifications (check OS settings)
3. Verify the extension is enabled in `chrome://extensions/`

### Too many notifications
- The extension has built-in debouncing (1 second) and cooldown (5 seconds)
- Disable notifications temporarily via the popup if needed

### Extension not detecting changes
- Some single-page applications may require page reload
- Check browser console for error messages
- Ensure the content script is loaded (check DevTools > Sources)

## Development

### Generate Icons
```bash
cd icons
python3 generate_icons.py
```

### Debugging
1. Go to `chrome://extensions/`
2. Find "Web UI Change Detector"
3. Click "Inspect views: background page" to debug background script
4. Open DevTools on any webpage to debug content script

## Version History

### v1.0.0
- Initial release
- DOM change detection
- System notifications
- Configurable settings
- Statistics tracking

## License

MIT License - Feel free to use and modify as needed.

## Contributing

Issues and pull requests are welcome! Please feel free to contribute to improve this extension.

---

**Note**: This extension is designed for development and testing purposes. Be mindful of notification frequency when browsing production websites.