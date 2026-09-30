// Background service worker for UI Change Detector
/**
 * @constant {number} Chrome storage 配额上限 (bytes)
 * chrome.storage.local 默认 10MB，启用 unlimitedStorage 后无限制
 */
const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024; // 10MB
let notificationSettings = {
  enabled: true,
  sound: true,
  requireInteraction: false
};

let stats = {
  totalChanges: 0,
  lastChangeTime: null
};

// Load settings from storage on startup
chrome.storage.local.get(['notificationSettings', 'stats'], (result) => {
  if (result.notificationSettings) {
    notificationSettings = { ...notificationSettings, ...result.notificationSettings };
  }
  if (result.stats) {
    stats = { ...stats, ...result.stats };
  }
  console.log('UI Change Detector: Settings loaded', notificationSettings);
});

// Listen for storage changes (e.g., from popup)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.notificationSettings && changes.notificationSettings.newValue) {
      notificationSettings = { ...notificationSettings, ...changes.notificationSettings.newValue };
      console.log('UI Change Detector: Settings updated', notificationSettings);
    } else if (changes.notificationSettings && !changes.notificationSettings.newValue) {
      // Key was removed — reset to defaults
      notificationSettings = {
        enabled: true,
        sound: true,
        requireInteraction: false
      };
      console.log('UI Change Detector: Settings reset to defaults');
    }
    if (changes.stats && changes.stats.newValue) {
      stats = { ...stats, ...changes.stats.newValue };
    } else if (changes.stats && !changes.stats.newValue) {
      // stats key removed — reset counters
      stats = { totalChanges: 0, lastChangeTime: null };
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UI_CHANGE_DETECTED') {
    // Await async handleUICChange before responding to ensure the notification
    // is actually created before the caller receives confirmation.
    handleUICChange(message.payload, sender)
      .then(() => sendResponse({ received: true }))
      .catch((err) => {
        console.error('handleUICChange failed:', err);
        sendResponse({ received: false, error: String(err) });
      });
    return true; // Keep message channel open for async response
  } else if (message.type === 'TEST_NOTIFICATION') {
    // Await async sendTestNotification before responding so the popup
    // knows whether the test notification was actually delivered.
    sendTestNotification()
      .then(() => sendResponse({ received: true }))
      .catch((err) => {
        console.error('sendTestNotification failed:', err);
        sendResponse({ received: false, error: String(err) });
      });
    return true; // Keep message channel open for async response
  } else if (message.type === 'GET_STATS') {
    // Return current stats to popup
    sendResponse({ stats });
  }
  // No return true needed for synchronous sendResponse paths
});

async function handleUICChange(notificationData, sender) {
  if (!notificationSettings.enabled) {
    console.log('Notifications disabled');
    return;
  }

  // Update stats atomically: read latest from storage, increment, write back
  // This prevents stale in-memory values from overwriting concurrent updates
  try {
    const stored = await chrome.storage.local.get('stats');
    if (stored.stats) {
      stats = { ...stats, ...stored.stats };
    }
  } catch (_) {}
  stats.totalChanges++;
  stats.lastChangeTime = new Date().toISOString();
  chrome.storage.local.set({ stats });
  
  // Broadcast stats update to popup
  chrome.runtime.sendMessage({ type: 'STATS_UPDATED', stats }).catch(() => {});

  const title = notificationData.title || 'UI Change Detected';
  const message = notificationData.message || 'A change has been detected on the page.';
  // 优先使用 sender.tab.id（来自 content script 消息通道），
  // 回退到 notificationData.tabId（由调用方显式传入）
  const tabId = (sender && sender.tab && sender.tab.id) || notificationData.tabId;
  const url = (sender && sender.tab && sender.tab.url) || notificationData.url;

  const notificationOptions = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    silent: !notificationSettings.sound,
    requireInteraction: notificationSettings.requireInteraction
  };

  try {
    const notificationId = await chrome.notifications.create('', notificationOptions);

    // Store per-notification tab info for click handling (keyed by notificationId)
    if (tabId || url) {
      const notifMap = (await chrome.storage.local.get('notificationTabs')).notificationTabs || {};
      notifMap[notificationId] = { tabId: tabId || null, url: url || null };
      // 限制存储条目数，防止无限增长（保留最近 20 条）
      const keys = Object.keys(notifMap);
      if (keys.length > 20) {
        keys.slice(0, keys.length - 20).forEach(k => delete notifMap[k]);
      }
      await chrome.storage.local.set({ notificationTabs: notifMap });
    }

    console.log('Notification sent:', notificationId);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

async function sendTestNotification() {
  const notificationOptions = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Test Notification',
    message: 'This is a test notification from Web UI Change Detector',
    silent: !notificationSettings.sound,
    requireInteraction: notificationSettings.requireInteraction
  };

  const notificationId = await chrome.notifications.create('', notificationOptions);
  console.log('Test notification sent:', notificationId);
}

// Handle notification click - look up the specific tab for this notification
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const data = await chrome.storage.local.get('notificationTabs');
  const notifMap = data.notificationTabs || {};
  const entry = notifMap[notificationId];

  // 清理已点击的通知记录
  delete notifMap[notificationId];
  await chrome.storage.local.set({ notificationTabs: notifMap });

  const tabId = entry && entry.tabId;
  const url = entry && entry.url;

  if (tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      await chrome.tabs.update(tabId, { active: true });
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    } catch (error) {
      console.error('Failed to activate tab:', error);
      if (url) {
        chrome.tabs.create({ url: url });
      }
    }
  } else if (url) {
    chrome.tabs.create({ url: url });
  }
  
  chrome.notifications.clear(notificationId);
});
