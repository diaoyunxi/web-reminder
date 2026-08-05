// Popup script: Handles UI interactions and settings

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const enableNotificationsCheckbox = document.getElementById('enableNotifications');
  const enableSoundCheckbox = document.getElementById('enableSound');
  const requireInteractionCheckbox = document.getElementById('requireInteraction');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const changesCountEl = document.getElementById('changesCount');
  const lastChangeEl = document.getElementById('lastChange');
  const testNotificationBtn = document.getElementById('testNotificationBtn');
  const resetStatsBtn = document.getElementById('resetStatsBtn');

  // Load settings from storage
  function loadSettings() {
    chrome.storage.local.get(['notificationSettings', 'stats'], (result) => {
      if (result.notificationSettings) {
        enableNotificationsCheckbox.checked = result.notificationSettings.enabled !== false;
        enableSoundCheckbox.checked = result.notificationSettings.sound !== false;
        requireInteractionCheckbox.checked = result.notificationSettings.requireInteraction === true;
      }

      if (result.stats) {
        changesCountEl.textContent = result.stats.count || 0;
        if (result.stats.lastChange) {
          const date = new Date(result.stats.lastChange);
          lastChangeEl.textContent = formatTime(date);
        }
      }

      updateStatus();
    });
  }

  // Save settings to storage
  function saveSettings() {
    const settings = {
      enabled: enableNotificationsCheckbox.checked,
      sound: enableSoundCheckbox.checked,
      requireInteraction: requireInteractionCheckbox.checked
    };

    chrome.storage.local.set({ notificationSettings: settings }, () => {
      console.log('Settings saved:', settings);
      updateStatus();
    });
  }

  // Update status indicator
  function updateStatus() {
    const isEnabled = enableNotificationsCheckbox.checked;
    
    if (isEnabled) {
      statusIndicator.className = 'status-indicator active';
      statusText.textContent = 'Monitoring Active';
    } else {
      statusIndicator.className = 'status-indicator inactive';
      statusText.textContent = 'Monitoring Paused';
    }
  }

  // Format time for display
  function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 24 hours
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Test notification
  function sendTestNotification() {
    chrome.runtime.sendMessage({
      type: 'TEST_NOTIFICATION'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending test notification:', chrome.runtime.lastError);
      }
    });
  }

  // Reset statistics
  function resetStatistics() {
    chrome.storage.local.remove(['stats'], () => {
      changesCountEl.textContent = '0';
      lastChangeEl.textContent = '-';
    });
  }

  // Event listeners
  enableNotificationsCheckbox.addEventListener('change', saveSettings);
  enableSoundCheckbox.addEventListener('change', saveSettings);
  requireInteractionCheckbox.addEventListener('change', saveSettings);
  
  testNotificationBtn.addEventListener('click', sendTestNotification);
  resetStatsBtn.addEventListener('click', resetStatistics);

  // Listen for updates from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STATS_UPDATED') {
      loadSettings();
    }
    return true;
  });

  // Initial load
  loadSettings();
});
