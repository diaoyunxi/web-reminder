// Background service worker: Handles UI change events and sends system notifications

// Store notification settings
let notificationSettings = {
  enabled: true,
  sound: true,
  requireInteraction: false
};

// Load settings from storage on startup
chrome.storage.local.get(['notificationSettings'], (result) => {
  if (result.notificationSettings) {
    notificationSettings = { ...notificationSettings, ...result.notificationSettings };
  }
  console.log('UI Change Detector: Settings loaded', notificationSettings);
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UI_CHANGE_DETECTED') {
    handleUICChange(message.payload, sender);
    sendResponse({ received: true });
  }
  return true; // Keep message channel open for async response
});

// Handle UI change detection
function handleUICChange(payload, sender) {
  if (!notificationSettings.enabled) {
    console.log('Notifications are disabled');
    return;
  }

  const tabId = sender.tab?.id;
  const url = payload.url || sender.tab?.url || 'Unknown URL';
  const title = payload.title || sender.tab?.title || 'Page Changed';
  
  console.log(`UI Change detected on ${url}`);

  // Create and show notification
  showNotification({
    title: 'UI Change Detected',
    message: `Page "${truncateText(title, 50)}" has been modified`,
    url: url,
    tabId: tabId,
    timestamp: payload.timestamp
  });
}

// Show system notification using Chrome Notifications API
function showNotification(options) {
  const notificationId = `ui-change-${Date.now()}`;
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: options.title,
    message: options.message,
    priority: 2,
    requireInteraction: notificationSettings.requireInteraction,
    silent: !notificationSettings.sound,
    buttons: [
      { title: 'Open Page' },
      { title: 'Dismiss' }
    ]
  }, (createdId) => {
    console.log('Notification created:', createdId);
    
    // Store notification info for click handling
    chrome.storage.local.set({
      [`notification_${createdId}`]: {
        url: options.url,
        tabId: options.tabId
      }
    });
  });
}

// Handle notification clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  chrome.storage.local.get([`notification_${notificationId}`], (result) => {
    const notificationData = result[`notification_${notificationId}`];
    
    if (buttonIndex === 0 && notificationData?.url) {
      // Open page button clicked
      if (notificationData.tabId) {
        // Activate existing tab
        chrome.tabs.update(notificationData.tabId, { active: true });
        chrome.windows.update(notificationData.tabId, { focused: true });
      } else {
        // Open new tab
        chrome.tabs.create({ url: notificationData.url });
      }
    }
    
    // Clear notification
    chrome.notifications.clear(notificationId);
    chrome.storage.local.remove([`notification_${notificationId}`]);
  });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.storage.local.get([`notification_${notificationId}`], (result) => {
    const notificationData = result[`notification_${notificationId}`];
    
    if (notificationData?.url) {
      if (notificationData.tabId) {
        chrome.tabs.update(notificationData.tabId, { active: true });
        chrome.windows.update(notificationData.tabId, { focused: true });
      } else {
        chrome.tabs.create({ url: notificationData.url });
      }
    }
    
    chrome.notifications.clear(notificationId);
    chrome.storage.local.remove([`notification_${notificationId}`]);
  });
});

// Handle notification closure
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  chrome.storage.local.remove([`notification_${notificationId}`]);
});

// Utility function to truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Request notification permission on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Request notification permission
    chrome.notifications.create('welcome-notification', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'UI Change Detector Installed',
      message: 'Extension is now monitoring UI changes on web pages',
      priority: 2
    });
  }
});

console.log('UI Change Detector background service worker initialized');
