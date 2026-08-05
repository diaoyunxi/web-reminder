// Popup script for Web UI Change Detector
document.addEventListener('DOMContentLoaded', () => {
  const enableNotificationsCheckbox = document.getElementById('enableNotifications');
  const soundCheckbox = document.getElementById('sound');
  const requireInteractionCheckbox = document.getElementById('requireInteraction');
  const testNotificationBtn = document.getElementById('testNotification');
  const totalChangesEl = document.getElementById('totalChanges');
  const lastChangeTimeEl = document.getElementById('lastChangeTime');
  const statusEl = document.getElementById('status');

  // Load settings from storage
  chrome.storage.local.get(['notificationSettings', 'stats'], (result) => {
    if (result.notificationSettings) {
      enableNotificationsCheckbox.checked = result.notificationSettings.enabled !== false;
      soundCheckbox.checked = result.notificationSettings.sound !== false;
      requireInteractionCheckbox.checked = result.notificationSettings.requireInteraction === true;
    }

    if (result.stats) {
      updateStatsDisplay(result.stats);
    } else {
      // Request stats from background
      chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
        if (response && response.stats) {
          updateStatsDisplay(response.stats);
        }
      });
    }

    updateStatus();
  });

  // Update status display
  function updateStatus() {
    const isEnabled = enableNotificationsCheckbox.checked;
    if (isEnabled) {
      statusEl.textContent = 'Extension Active';
      statusEl.className = 'status active';
    } else {
      statusEl.textContent = 'Notifications Disabled';
      statusEl.className = 'status inactive';
    }
  }

  // Update stats display
  function updateStatsDisplay(stats) {
    totalChangesEl.textContent = stats.totalChanges || 0;
    
    if (stats.lastChangeTime) {
      const date = new Date(stats.lastChangeTime);
      lastChangeTimeEl.textContent = formatRelativeTime(date);
    } else {
      lastChangeTimeEl.textContent = 'Never';
    }
  }

  // Format relative time
  function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  // Save settings
  function saveSettings() {
    const settings = {
      enabled: enableNotificationsCheckbox.checked,
      sound: soundCheckbox.checked,
      requireInteraction: requireInteractionCheckbox.checked
    };

    chrome.storage.local.set({ notificationSettings: settings }, () => {
      console.log('Settings saved:', settings);
      updateStatus();
    });
  }

  // Event listeners for checkboxes
  enableNotificationsCheckbox.addEventListener('change', saveSettings);
  soundCheckbox.addEventListener('change', saveSettings);
  requireInteractionCheckbox.addEventListener('change', saveSettings);

  // Test notification button
  testNotificationBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to send test notification:', chrome.runtime.lastError.message);
      } else {
        console.log('Test notification sent');
      }
    });
  });

  // Listen for stats updates from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STATS_UPDATED' && message.stats) {
      updateStatsDisplay(message.stats);
    }
  });
});
