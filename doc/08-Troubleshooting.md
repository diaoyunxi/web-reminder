> [← 返回文档目录](../README.md) ｜ 本分册由 `README.md` 的「Troubleshooting」章节拆分而来。

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
