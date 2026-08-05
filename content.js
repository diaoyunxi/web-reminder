// Content script: Monitors DOM changes and detects UI modifications
(function() {
  'use strict';

  // Configuration for UI change detection
  const CONFIG = {
    // Debounce time in ms to avoid too many notifications
    debounceTime: 2000,
    // Minimum time between notifications for the same page
    notificationCooldown: 5000,
    // Observe these types of mutations
    mutationOptions: {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    }
  };

  let lastSnapshot = null;
  let debounceTimer = null;
  let lastNotificationTime = 0;
  let changeCount = 0;

  // Generate a simple hash of the page's important UI elements
  function generateSnapshot() {
    const elements = document.querySelectorAll('body > *, head title, meta[name="description"], meta[property="og:title"]');
    let snapshot = '';
    
    elements.forEach((el, index) => {
      if (el.tagName === 'TITLE') {
        snapshot += `title:${el.textContent}|`;
      } else if (el.tagName === 'META') {
        snapshot += `meta:${el.getAttribute('content') || ''}|`;
      } else {
        // Include tag name, id, class, and text content (truncated)
        const id = el.id ? `#${el.id}` : '';
        const className = el.className ? `.${el.className.split(' ').join('.')}` : '';
        const text = el.textContent ? el.textContent.trim().substring(0, 50) : '';
        snapshot += `${el.tagName}${id}${className}:${text}|`;
      }
    });

    return snapshot;
  }

  // Send notification to background script
  function sendUICChangeNotification(details) {
    const now = Date.now();
    
    // Check cooldown
    if (now - lastNotificationTime < CONFIG.notificationCooldown) {
      return;
    }

    chrome.runtime.sendMessage({
      type: 'UI_CHANGE_DETECTED',
      payload: {
        url: window.location.href,
        title: document.title,
        changeType: details.changeType,
        timestamp: now,
        changeCount: changeCount
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('UI Change Detector:', chrome.runtime.lastError.message);
      }
    });

    lastNotificationTime = now;
    changeCount = 0;
  }

  // Handle detected changes
  function handleUIChange(changeType) {
    changeCount++;

    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new debounce timer
    debounceTimer = setTimeout(() => {
      const currentSnapshot = generateSnapshot();
      
      if (lastSnapshot && currentSnapshot !== lastSnapshot) {
        sendUICChangeNotification({
          changeType: changeType
        });
        lastSnapshot = currentSnapshot;
      }
    }, CONFIG.debounceTime);
  }

  // Initialize MutationObserver
  function initializeObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasSignificantChange = false;

      mutations.forEach((mutation) => {
        // Filter out insignificant changes
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          hasSignificantChange = true;
        } else if (mutation.type === 'attributes') {
          // Only track certain attribute changes
          const significantAttributes = ['class', 'style', 'id', 'src', 'href', 'disabled', 'hidden'];
          if (significantAttributes.includes(mutation.attributeName)) {
            hasSignificantChange = true;
          }
        } else if (mutation.type === 'characterData') {
          hasSignificantChange = true;
        }
      });

      if (hasSignificantChange) {
        handleUIChange('dom_mutation');
      }
    });

    // Start observing
    observer.observe(document.body || document.documentElement, CONFIG.mutationOptions);

    // Also observe title changes
    const titleElement = document.querySelector('title');
    if (titleElement) {
      const titleObserver = new MutationObserver(() => {
        handleUIChange('title_change');
      });
      titleObserver.observe(titleElement, { characterData: true });
    }
  }

  // Initialize when DOM is ready
  function init() {
    lastSnapshot = generateSnapshot();
    
    if (document.body) {
      initializeObserver();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        initializeObserver();
      });
    }

    console.log('UI Change Detector initialized for:', window.location.hostname);
  }

  // Start the detector
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
