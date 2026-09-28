// Content script for detecting UI changes
(function() {
  'use strict';

  let lastSnapshot = '';
  let debounceTimer = null;
  /**
 * 防抖延迟时间 (毫秒)
 * 在 UI 变化后等待 1 秒再发送通知，避免短时间内重复触发
 * 当页面快速更新时（如动画、滚动），可有效减少通知噪音
 */
const DEBOUNCE_DELAY = 1000;
  /**
 * 冷却期时间 (毫秒)
 * 两次通知之间至少间隔 5 秒，防止用户被频繁打扰
 * 适用于 UI 持续变化的场景（如实时数据更新）
 */
const COOLDOWN_PERIOD = 5000;
  let lastNotificationTime = 0;

  // Store observer references for cleanup
  let mainObserver = null;
  let titleObserver = null;

  // Generate a snapshot of the current UI state
  function generateSnapshot() {
    const body = document.body;
    if (!body) return '';

    let snapshot = '';
    
    // Get all direct children of body
    const children = Array.from(body.children);
    
    for (const el of children) {
      // Skip script and style tags
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
      
      const id = el.id ? `#${el.id}` : '';
      
      // Handle className safely for SVG elements
      let className = '';
      if (el.className) {
        if (typeof el.className === 'string') {
          className = el.className.trim() ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
        } else if (el.className.baseVal !== undefined) {
          // SVG elements
          className = el.className.baseVal.trim() ? `.${el.className.baseVal.trim().split(/\s+/).join('.')}` : '';
        }
      }
      
      const text = el.textContent ? el.textContent.trim().substring(0, 50) : '';
      snapshot += `${el.tagName}${id}${className}:${text}|`;
    }

    // Include title
    snapshot += `TITLE:${document.title}|`;
    
    // Include important meta information
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      snapshot += `META_DESC:${metaDescription.getAttribute('content')}|`;
    }

    return snapshot;
  }

  // Send notification to background script
  function sendNotification(changeType, details = {}) {
    const now = Date.now();
    
    // Cooldown check
    if (now - lastNotificationTime < COOLDOWN_PERIOD) {
      return;
    }
    
    lastNotificationTime = now;

    chrome.runtime.sendMessage({
      type: 'UI_CHANGE_DETECTED',
      payload: {
        title: `UI Change: ${changeType}`,
        message: details.message || `A ${changeType} has been detected on ${document.title}`,
        url: window.location.href,
        tabId: null // Will be set by background script
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Failed to send message:', chrome.runtime.lastError.message);
      }
    });
  }

  // Handle UI change with debouncing
  function handleUIChange(changeType, details = {}) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      const currentSnapshot = generateSnapshot();
      
      if (currentSnapshot !== lastSnapshot) {
        lastSnapshot = currentSnapshot;
        sendNotification(changeType, details);
      }
    }, DEBOUNCE_DELAY);
  }

  // Cleanup observers and timers on page unload
  function cleanup() {
    if (mainObserver) {
      mainObserver.disconnect();
      mainObserver = null;
    }
    if (titleObserver) {
      titleObserver.disconnect();
      titleObserver = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  // Initialize MutationObserver
  function initObserver() {
    mainObserver = new MutationObserver((mutations) => {
      let hasSignificantChange = false;
      
      for (const mutation of mutations) {
        // Check for child list changes (additions or removals)
        if (mutation.type === 'childList' && 
            (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
          hasSignificantChange = true;
          break;
        }
        
        // Check for attribute changes on visible elements
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.nodeType === Node.ELEMENT_NODE) {
            const element = target;
            // Only track significant attribute changes
            if (['class', 'style', 'hidden', 'disabled'].includes(mutation.attributeName)) {
              hasSignificantChange = true;
              break;
            }
          }
        }
      }

      if (hasSignificantChange) {
        handleUIChange('dom_mutation');
      }
    });

    // Start observing
    mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'disabled'],
      characterData: true
    });

    // Also observe title changes
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleObserver = new MutationObserver(() => {
        handleUIChange('title_change', { 
          message: `Page title changed to: ${document.title}` 
        });
      });
      
      titleObserver.observe(titleElement, { 
        characterData: true,
        childList: true,
        subtree: true
      });
    }

    // Register cleanup on page unload
    window.addEventListener('beforeunload', cleanup);

    // Capture initial snapshot
    lastSnapshot = generateSnapshot();
    
    console.log('UI Change Detector initialized on:', window.location.href);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
})();
