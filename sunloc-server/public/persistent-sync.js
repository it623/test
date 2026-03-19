/**
 * Permanent Data Sync - Ensures all app data persists to server
 * Include this script in planning.html, dpr.html, and tracking.html
 */

// Configuration
const SYNC_CONFIG = {
  serverUrl: window.location.origin,
  syncInterval: 10000,  // Auto-sync every 10 seconds
  apiEndpoint: '/api/planning/state'  // Override in each app
};

// Override saveState() to also push to server
const originalSaveState = typeof saveState === 'function' ? saveState : null;
function saveState() {
  // Save to localStorage first (for offline support)
  if (typeof saveLocal === 'function') saveLocal();
  
  // Then immediately sync to server
  if (typeof pushToServer === 'function') {
    pushToServer().catch(e => console.warn('Server sync failed:', e));
  } else {
    // Fallback: manual sync
    const data = { state: typeof state !== 'undefined' ? state : null };
    fetch(SYNC_CONFIG.serverUrl + SYNC_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(e => console.warn('Direct sync failed:', e));
  }
}

// On page load, always pull from server first
async function initPermanentSync() {
  try {
    console.log('🔄 Loading persistent data from server...');
    
    // Fetch latest state from server
    const response = await fetch(SYNC_CONFIG.serverUrl + SYNC_CONFIG.apiEndpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.ok && data.state) {
      // Update global state
      if (typeof state !== 'undefined') {
        Object.assign(state, data.state);
        console.log('✅ Loaded persistent data from server');
      }
    }
  } catch (e) {
    console.warn('Could not load from server, using localStorage:', e.message);
  }
  
  // Start auto-sync timer
  setInterval(() => {
    if (typeof pushToServer === 'function') {
      pushToServer().catch(e => console.warn('Auto-sync failed:', e));
    }
  }, SYNC_CONFIG.syncInterval);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPermanentSync);
} else {
  initPermanentSync();
}

console.log('✅ Permanent Data Sync loaded');
