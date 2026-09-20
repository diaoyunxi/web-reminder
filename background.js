// Background service worker for UI Change Detector
let notificationSettings = {
  enabled: true,
  sound: true,
  requireInteraction: false
};

// 安全上限：防止 totalChanges 无限增长导致存储膨胀或整数溢出
const MAX_TOTAL_CHANGES = 999999;

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
    // 防御性校验：确保加载的 totalChanges 为合法数值且不超上限
    if (typeof stats.totalChanges !== 'number' || isNaN(stats.totalChanges)) {
      stats.totalChanges = 0;
    }
    if (stats.totalChanges > MAX_TOTAL_CHANGES) {
      stats.totalChanges = MAX_TOTAL_CHANGES;
    }
  }
  console.log('UI Change Detector: Settings loaded', notificationSettings);
});

// Listen for storage changes (e.g., from popup)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.notificationSettings) {
      notificationSettings = { ...notificationSettings, ...changes.notificationSettings.newValue };
      console.log('UI Change Detector: Settings updated', notificationSettings);
    }
    if (changes.stats) {
      stats = { ...stats, ...changes.stats.newValue };
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UI_CHANGE_DETECTED') {
    handleUICChange(message.payload, sender);
    sendResponse({ received: true });
  } else if (message.type === 'TEST_NOTIFICATION') {
    // Handle test notification from popup
    sendTestNotification();
    sendResponse({ received: true });
  } else if (message.type === 'GET_STATS') {
    // Return current stats to popup
    sendResponse({ stats });
  }
  return true; // Keep message channel open for async response
});

async function handleUICChange(notificationData, sender) {
  if (!notificationSettings.enabled) {
    console.log('Notifications disabled');
    return;
  }

  // Update stats with safety cap
  if (stats.totalChanges < MAX_TOTAL_CHANGES) {
    stats.totalChanges++;
  }
  stats.lastChangeTime = new Date().toISOString();
  chrome.storage.local.set({ stats });
  
  // Broadcast stats update to popup
  chrome.runtime.sendMessage({ type: 'STATS_UPDATED', stats }).catch(() => {});

  const title = notificationData.title || 'UI Change Detected';
  const message = notificationData.message || 'A change has been detected on the page.';
  const tabId = notificationData.tabId;
  const url = notificationData.url;

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
    console.log('Notification created:', notificationId);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

function sendTestNotification() {
  const testOptions = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Web Reminder Test',
    message: 'This is a test notification to verify the extension is working.',
    silent: !notificationSettings.sound
  };

  chrome.notifications.create('', testOptions, (id) => {
    if (chrome.runtime.lastError) {
      console.error('Test notification failed:', chrome.runtime.lastError.message);
    } else {
      console.log('Test notification sent:', id);
    }
  });
}
