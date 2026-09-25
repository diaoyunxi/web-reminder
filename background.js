// Background service worker for UI Change Detector
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
    
    // Store tab info for click handling
    if (tabId) {
      await chrome.storage.local.set({ 
        lastNotificationTabId: tabId,
        lastNotificationUrl: url 
      });
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

  try {
    const notificationId = await chrome.notifications.create('', notificationOptions);
    console.log('Test notification sent:', notificationId);
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
}

// Handle notification click
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const data = await chrome.storage.local.get(['lastNotificationTabId', 'lastNotificationUrl']);
  
  if (data.lastNotificationTabId) {
    try {
      // Get tab info to get windowId
      const tab = await chrome.tabs.get(data.lastNotificationTabId);
      
      // Activate the tab
      await chrome.tabs.update(data.lastNotificationTabId, { active: true });
      
      // Focus the window
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      
      console.log('Navigated to tab:', data.lastNotificationTabId);
    } catch (error) {
      console.error('Failed to activate tab:', error);
      // If tab doesn't exist, open URL in new tab
      if (data.lastNotificationUrl) {
        chrome.tabs.create({ url: data.lastNotificationUrl });
      }
    }
  } else if (data.lastNotificationUrl) {
    // No tab ID, open URL in new tab
    chrome.tabs.create({ url: data.lastNotificationUrl });
  }
  
  // Clear the notification
  chrome.notifications.clear(notificationId);
});
