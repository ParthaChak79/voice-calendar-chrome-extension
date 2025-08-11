// Content script for the calendar extension
class CalendarContentScript {
  constructor() {
    this.init();
  }

  init() {
    // Only initialize if we're not on the calendar app itself
    if (window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('replit.app')) {
      return;
    }

    this.addFloatingButton();
    this.setupKeyboardShortcuts();
  }

  addFloatingButton() {
    // Create a floating button for quick access
    const button = document.createElement('div');
    button.id = 'calendar-extension-button';
    button.innerHTML = '📅';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      transition: all 0.2s ease;
    `;

    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    button.addEventListener('click', this.openCalendarPopup.bind(this));
    document.body.appendChild(button);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt + C to open calendar
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        this.openCalendarPopup();
      }
    });
  }

  async openCalendarPopup() {
    // Send message to background script to open popup
    chrome.runtime.sendMessage({
      action: 'openPopup'
    });
  }
}

// Initialize content script
new CalendarContentScript();