> [← 返回文档目录](../README.md) ｜ 本分册由 `README.md` 的「How It Works」章节拆分而来。

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
