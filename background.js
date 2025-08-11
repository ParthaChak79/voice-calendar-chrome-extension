// Background script for the calendar extension
class CalendarBackground {
  constructor() {
    this.serverUrls = [
      'http://localhost:5000',
      'http://127.0.0.1:5000'
    ];
    this.activeServerUrl = null;
    this.notificationIds = new Set(); // Track notification IDs to avoid duplicates
    this.init();
  }

  init() {
    console.log('Initializing Calendar Background Script...');
    
    // Check if Chrome APIs are available
    if (typeof chrome === 'undefined') {
      console.error('Chrome APIs not available');
      return;
    }

    // Set up event listeners with error handling
    try {
      if (chrome.runtime && chrome.runtime.onInstalled) {
        chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this));
      }
      
      if (chrome.action && chrome.action.onClicked) {
        chrome.action.onClicked.addListener(this.onActionClicked.bind(this));
      }
      
      if (chrome.notifications && chrome.notifications.onClicked) {
        chrome.notifications.onClicked.addListener(this.onNotificationClicked.bind(this));
      }
      
      if (chrome.alarms && chrome.alarms.onAlarm) {
        chrome.alarms.onAlarm.addListener(this.checkUpcomingEvents.bind(this));
      }
      
      console.log('Event listeners set up successfully');
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
    
    // Find working server URL
    this.findWorkingServer().catch(error => {
      console.error('Error finding working server:', error);
    });
    
    // Set up alarm for periodic event checking
    this.setupPeriodicCheck().catch(error => {
      console.error('Error setting up periodic check:', error);
    });
  }

  async findWorkingServer() {
    console.log('Looking for working server...');
    
    for (const url of this.serverUrls) {
      try {
        console.log(`Testing server: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${url}/api/auth/me`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.status < 500) {
          this.activeServerUrl = url;
          console.log('Found working server:', url);
          return;
        }
      } catch (error) {
        console.log(`Server not available: ${url} - ${error.message}`);
      }
    }
    
    console.log('No working server found');
  }

  async onInstalled(details) {
    console.log('Calendar extension installed:', details.reason);
    
    if (details.reason === 'install') {
      await this.showWelcomeNotification();
    }
  }

  async showWelcomeNotification() {
    try {
      if (chrome.notifications && chrome.notifications.create) {
        const notificationId = `welcome-${Date.now()}`;
        
        chrome.notifications.create(notificationId, {
          type: 'basic',
          iconUrl: 'icons/icon48.png', // Simplified path
          title: 'Voice Calendar Scheduler',
          message: 'Extension installed! Click the calendar icon to get started.',
        }, (createdId) => {
          if (chrome.runtime.lastError) {
            console.error('Notification creation error:', chrome.runtime.lastError);
          } else {
            console.log('Welcome notification created:', createdId);
          }
        });
      }
    } catch (error) {
      console.error('Error showing welcome notification:', error);
    }
  }

  async onActionClicked(tab) {
    console.log('Extension icon clicked');
    // The popup will handle the UI, this is just for logging
  }

  async onNotificationClicked(notificationId) {
    console.log('Notification clicked:', notificationId);
    
    try {
      if (chrome.tabs && chrome.tabs.create) {
        const serverUrl = this.activeServerUrl || this.serverUrls[0];
        
        chrome.tabs.create({ url: serverUrl }, (tab) => {
          if (chrome.runtime.lastError) {
            console.error('Error creating tab:', chrome.runtime.lastError);
          } else {
            console.log('Opened calendar in new tab:', tab.id);
          }
        });
      }
      
      // Clear the notification
      if (chrome.notifications && chrome.notifications.clear) {
        chrome.notifications.clear(notificationId, (wasCleared) => {
          if (chrome.runtime.lastError) {
            console.error('Error clearing notification:', chrome.runtime.lastError);
          }
        });
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  async setupPeriodicCheck() {
    try {
      if (chrome.alarms && chrome.alarms.create) {
        // Clear existing alarm first
        chrome.alarms.clear('checkUpcomingEvents', (wasCleared) => {
          console.log('Previous alarm cleared:', wasCleared);
        });
        
        // Create new alarm to check for upcoming events every 5 minutes
        chrome.alarms.create('checkUpcomingEvents', {
          delayInMinutes: 1,
          periodInMinutes: 5,
        });
        
        console.log('Periodic event check alarm created');
      } else {
        console.warn('Chrome alarms API not available');
      }
    } catch (error) {
      console.error('Error setting up periodic check:', error);
    }
  }

  async checkUpcomingEvents(alarm) {
    if (!alarm || alarm.name !== 'checkUpcomingEvents') {
      return;
    }

    console.log('Checking for upcoming events...');

    if (!this.activeServerUrl) {
      await this.findWorkingServer();
      if (!this.activeServerUrl) {
        console.log('No active server found, skipping event check');
        return;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.activeServerUrl}/api/events`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, skipping event notifications');
        } else {
          console.log('Failed to fetch events, status:', response.status);
        }
        return;
      }

      const events = await response.json();
      console.log(`Found ${events.length} events`);
      
      await this.processUpcomingEvents(events);
    } catch (error) {
      console.error('Error checking upcoming events:', error);
      
      // If server is unreachable, try to find a new one
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        console.log('Server seems unreachable, looking for alternative...');
        this.activeServerUrl = null;
        await this.findWorkingServer();
      }
    }
  }

  async processUpcomingEvents(events) {
    if (!Array.isArray(events)) {
      console.warn('Events is not an array:', events);
      return;
    }

    const now = new Date();
    const upcomingEvents = events.filter(event => {
      if (!event.startDate) {
        console.warn('Event missing startDate:', event);
        return false;
      }
      
      const eventDate = new Date(event.startDate);
      const minutesUntil = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));
      
      // Show notifications for events starting in 15 minutes or 1 hour
      // Also check if we haven't already shown this notification
      const notificationId = `event-${event.id}-${minutesUntil}`;
      const shouldNotify = (minutesUntil === 15 || minutesUntil === 60) && 
                          !this.notificationIds.has(notificationId);
      
      if (shouldNotify) {
        this.notificationIds.add(notificationId);
        // Clean up old notification IDs (older than 2 hours)
        setTimeout(() => this.notificationIds.delete(notificationId), 2 * 60 * 60 * 1000);
      }
      
      return shouldNotify;
    });

    console.log(`Found ${upcomingEvents.length} upcoming events to notify about`);

    for (const event of upcomingEvents) {
      await this.showEventNotification(event);
    }
  }

  async showEventNotification(event) {
    try {
      if (!chrome.notifications || !chrome.notifications.create) {
        console.warn('Chrome notifications API not available');
        return;
      }

      const eventDate = new Date(event.startDate);
      const now = new Date();
      const minutesUntil = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));
      
      let message;
      if (minutesUntil <= 15) {
        message = `Starting in ${minutesUntil} minutes`;
      } else if (minutesUntil <= 60) {
        message = `Starting in 1 hour`;
      } else {
        message = `Starting at ${eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      const notificationId = `event-${event.id}-${Date.now()}`;
      
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon48.png', // Simplified path
        title: event.title || 'Calendar Event',
        message: message,
        contextMessage: event.description || 'Upcoming event',
        requireInteraction: true // Keep notification visible until user interacts
      }, (createdId) => {
        if (chrome.runtime.lastError) {
          console.error('Error creating event notification:', chrome.runtime.lastError);
        } else {
          console.log('Event notification created:', createdId);
        }
      });
    } catch (error) {
      console.error('Error showing event notification:', error);
    }
  }
}

// Initialize background script with error handling
try {
  console.log('Starting Calendar Background Script...');
  new CalendarBackground();
} catch (error) {
  console.error('Error initializing Calendar Background Script:', error);
}