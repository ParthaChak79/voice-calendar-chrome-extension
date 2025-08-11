// Extension popup script
class CalendarExtension {
  constructor() {
    this.serverUrl = 'http://localhost:5000';
    this.init();
  }

  async init() {
    console.log('Initializing Calendar Extension...');
    
    // Try to detect if we're running on Replit
    try {
      const replitUrl = await this.detectReplitUrl();
      if (replitUrl) {
        this.serverUrl = replitUrl;
        console.log('Detected Replit URL:', replitUrl);
      }
    } catch (error) {
      console.log('Not running on Replit, using localhost');
    }

    console.log('Using server URL:', this.serverUrl);

    // Set up UI event listeners
    this.setupUI();

    // Test server connection
    const isConnected = await this.testConnection();
    
    if (isConnected) {
      // For localhost, open in new tab instead of iframe
      if (this.serverUrl.includes('localhost') || this.serverUrl.includes('127.0.0.1')) {
        this.showOpenInTabMessage();
      } else {
        this.loadApp();
      }
    } else {
      this.showError();
    }
  }

  setupUI() {
    // Set up event listeners
    const retryBtn = document.getElementById('retry-btn');
    const openServerBtn = document.getElementById('open-server-btn');
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retryConnection());
    }
    
    if (openServerBtn) {
      openServerBtn.addEventListener('click', () => this.openServerInTab());
    }

    // Set up debug info display
    this.setupDebugInfo();
  }

  setupDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    const debugDetails = document.getElementById('debug-details');
    
    if (debugInfo && debugDetails) {
      debugDetails.textContent = `URL: ${window.location.href}\nUser Agent: ${navigator.userAgent}`;
      
      // Show debug info after 5 seconds if still on error screen
      setTimeout(() => {
        const errorDiv = document.getElementById('error');
        if (errorDiv && errorDiv.style.display !== 'none') {
          debugInfo.style.display = 'block';
        }
      }, 5000);
    }
  }

  async detectReplitUrl() {
    // Get current tab to detect if we're on a Replit domain
    return new Promise((resolve) => {
      // Check if chrome.tabs is available
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            console.log('Chrome tabs API error:', chrome.runtime.lastError);
            resolve(null);
            return;
          }
          
          if (tabs[0] && tabs[0].url) {
            const url = new URL(tabs[0].url);
            console.log('Current tab URL:', url.hostname);
            
            if (url.hostname.includes('replit.app')) {
              // Extract the Replit app URL
              const replitUrl = `https://${url.hostname}`;
              resolve(replitUrl);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      } else {
        console.log('Chrome tabs API not available');
        resolve(null);
      }
    });
  }

  async testConnection() {
    try {
      console.log(`Testing connection to ${this.serverUrl}...`);
      
      // First try a simple fetch to see if server is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.serverUrl}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Server response status:', response.status);
      console.log('Server response headers:', Object.fromEntries(response.headers.entries()));
      
      // Check for iframe-related headers
      const xFrameOptions = response.headers.get('x-frame-options');
      const csp = response.headers.get('content-security-policy');
      
      if (xFrameOptions) {
        console.warn('X-Frame-Options header detected:', xFrameOptions);
      }
      
      if (csp && csp.includes('frame-ancestors')) {
        console.warn('Content-Security-Policy frame-ancestors detected:', csp);
      }
      
      // Accept any response that's not a network error
      return response.status < 500 || response.status === 401; // 401 is OK (not authenticated)
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // If localhost fails, try alternative URLs
      if (this.serverUrl.includes('localhost')) {
        console.log('Localhost failed, trying 127.0.0.1...');
        this.serverUrl = 'http://127.0.0.1:5000';
        return this.testConnection();
      }
      
      return false;
    }
  }

  loadApp() {
    console.log('Loading app...');
    const loading = document.getElementById('loading');
    const appContent = document.getElementById('app-content');
    const iframe = document.getElementById('app-container');

    if (!loading || !appContent || !iframe) {
      console.error('Required DOM elements not found');
      this.showError();
      return;
    }

    // Check if this is a hosted URL (should work in iframe)
    const isHosted = !this.serverUrl.includes('localhost') && !this.serverUrl.includes('127.0.0.1');
    
    if (!isHosted) {
      console.log('Local server detected, redirecting to tab instead of iframe');
      this.showOpenInTabMessage();
      return;
    }

    // Hide loading and show app
    loading.style.display = 'none';
    appContent.style.display = 'flex';

    // Load the calendar app in iframe
    iframe.src = this.serverUrl;
    console.log('Setting iframe src to:', this.serverUrl);
    
    let loadTimeout;
    let hasLoaded = false;

    // Handle iframe load events
    iframe.onload = () => {
      console.log('Iframe onload event fired');
      hasLoaded = true;
      clearTimeout(loadTimeout);
      
      // Check if iframe actually has content
      setTimeout(() => {
        try {
          // Try to access iframe content (may fail due to CORS)
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc && iframeDoc.body) {
            console.log('Iframe content accessible, body innerHTML length:', iframeDoc.body.innerHTML.length);
            if (iframeDoc.body.innerHTML.trim().length > 0) {
              console.log('Calendar app loaded successfully with content');
              this.updateStatusIndicator(true);
            } else {
              console.warn('Iframe loaded but appears empty');
              // Don't show error immediately, content might be loading
            }
          } else {
            console.log('Iframe content not accessible (likely CORS) - assuming success');
            this.updateStatusIndicator(true);
          }
        } catch (e) {
          // This is expected for cross-origin iframes
          console.log('Cannot access iframe content (CORS) - assuming app loaded successfully');
          this.updateStatusIndicator(true);
        }
      }, 1000);
    };

    iframe.onerror = (error) => {
      console.error('Iframe onerror event:', error);
      hasLoaded = true;
      clearTimeout(loadTimeout);
      this.showIframeError();
    };

    // Add timeout fallback - increased timeout and better checking
    loadTimeout = setTimeout(() => {
      if (!hasLoaded) {
        console.warn('Iframe timeout - no load event after 20 seconds');
        
        // Check if iframe src is set correctly
        console.log('Iframe src at timeout:', iframe.src);
        console.log('Iframe readyState at timeout:', iframe.readyState);
        
        // Try to determine if it's a network issue or content issue
        fetch(this.serverUrl, { method: 'HEAD', mode: 'no-cors' })
          .then(() => {
            console.log('Server is reachable, but iframe failed to load - possible CORS or content issue');
            // Show a different error message
            this.showIframeError();
          })
          .catch(() => {
            console.log('Server appears unreachable');
            this.showError();
          });
      }
    }, 20000); // 20 second timeout
  }

  showIframeError() {
    console.log('Showing iframe-specific error state');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const appContent = document.getElementById('app-content');
    
    if (loading) loading.style.display = 'none';
    if (appContent) appContent.style.display = 'none';
    if (error) {
      error.style.display = 'flex';
      
      // Update error message for iframe-specific issue
      const errorTitle = error.querySelector('h3');
      const errorMessage = error.querySelector('p');
      
      if (errorTitle) errorTitle.textContent = '🔒 Loading Issue';
      if (errorMessage) {
        errorMessage.innerHTML = `The calendar app is running but cannot be displayed in the extension popup.<br><br>
        <strong>Try these solutions:</strong><br>
        1. Click "Open Server" below to open in a full browser tab<br>
        2. Check if your server allows iframe embedding<br>
        3. Look for CORS or X-Frame-Options issues in server logs`;
      }
    }
    
    this.updateStatusIndicator(false);
  }

  showError() {
    console.log('Showing error state');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const appContent = document.getElementById('app-content');
    
    if (loading) loading.style.display = 'none';
    if (appContent) appContent.style.display = 'none';
    if (error) error.style.display = 'flex';
    
    this.updateStatusIndicator(false);
  }

  showOpenInTabMessage() {
    console.log('Showing open in tab message');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const appContent = document.getElementById('app-content');
    
    if (loading) loading.style.display = 'none';
    if (appContent) appContent.style.display = 'none';
    if (error) {
      error.style.display = 'flex';
      
      // Update content for "open in tab" message
      const errorTitle = error.querySelector('h3');
      const errorMessage = error.querySelector('p');
      const troubleshooting = error.querySelector('ol');
      
      if (errorTitle) errorTitle.textContent = '🚀 Calendar Ready!';
      if (errorMessage) {
        errorMessage.innerHTML = `Your calendar server is running on localhost. Due to browser security restrictions, it cannot be displayed directly in the extension popup.`;
      }
      if (troubleshooting) {
        troubleshooting.style.display = 'none';
      }
      
      // Update button text
      const retryBtn = document.getElementById('retry-btn');
      const openBtn = document.getElementById('open-server-btn');
      
      if (retryBtn) retryBtn.textContent = '🔄 Check Again';
      if (openBtn) {
        openBtn.textContent = '📅 Open Calendar';
        openBtn.style.background = '#10b981';
        openBtn.style.marginLeft = '0';
      }
    }
    
    this.updateStatusIndicator(true);
  }

  updateStatusIndicator(isConnected) {
    const indicator = document.getElementById('status-indicator');
    if (indicator) {
      if (isConnected) {
        indicator.classList.remove('error');
      } else {
        indicator.classList.add('error');
      }
    }
  }

  retryConnection() {
    console.log('Retrying connection...');
    
    // Show loading
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const appContent = document.getElementById('app-content');
    
    if (error) error.style.display = 'none';
    if (appContent) appContent.style.display = 'none';
    if (loading) loading.style.display = 'flex';
    
    // Reset and try connecting again
    setTimeout(() => this.init(), 100);
  }

  openServerInTab() {
    // Check if chrome.tabs is available
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: this.serverUrl }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome tabs API error:', chrome.runtime.lastError);
          this.fallbackOpenUrl();
        }
      });
    } else {
      this.fallbackOpenUrl();
    }
  }

  fallbackOpenUrl() {
    // Fallback: try to open in a new window
    try {
      window.open(this.serverUrl, '_blank');
    } catch (error) {
      console.error('Unable to open server URL:', error);
      // Last resort: copy URL to clipboard if possible
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.serverUrl).then(() => {
          alert(`Server URL copied to clipboard: ${this.serverUrl}`);
        }).catch(() => {
          alert(`Please manually open: ${this.serverUrl}`);
        });
      } else {
        alert(`Please manually open: ${this.serverUrl}`);
      }
    }
  }
}

// Initialize extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded, initializing extension...');
  new CalendarExtension();
});

// Handle popup resize for better UX
window.addEventListener('resize', () => {
  const iframe = document.getElementById('app-container');
  if (iframe) {
    iframe.style.height = `${window.innerHeight - 60}px`; // Account for header
  }
});

// Add error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error in popup:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in popup:', event.reason);
});