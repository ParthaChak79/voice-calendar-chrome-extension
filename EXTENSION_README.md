# Voice Calendar Scheduler Browser Extension

A powerful browser extension that brings voice-enabled calendar scheduling to your fingertips with recurring events and smart notifications.

## Features

### 🎙️ Voice-Powered Scheduling
- Create events using natural language voice commands
- OpenAI Whisper integration for accurate speech-to-text
- Automatic form filling from voice input

### 📅 Smart Calendar Management
- Full calendar view with month navigation
- Individual recurring event control (edit/delete specific occurrences)
- Exception tracking for modified instances
- Support for daily, weekly, monthly, and yearly patterns

### 🔔 Intelligent Notifications
- Real-time alerts for upcoming events (15 min, 1 hour, tomorrow)
- Background monitoring for event reminders
- Color-coded urgency levels

### 🔐 Secure Authentication
- User signup and login system
- Session-based authentication
- Protected API endpoints

## Installation

### From Source (Development)

1. **Start the Calendar Server**
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:5000`

2. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the project root directory (where `manifest.json` is located)

3. **Extension Setup**
   - The extension will automatically detect your local server
   - Click the calendar icon in your browser toolbar to open the popup
   - Sign up for a new account or log in with existing credentials

### For Production (Replit Deployment)

1. **Deploy to Replit**
   - Your app will get a `.replit.app` domain
   - Update the `host_permissions` in `manifest.json` with your domain

2. **Update Extension**
   - The extension automatically detects Replit domains
   - No additional configuration needed

## Usage

### Opening the Extension

1. **Toolbar Icon**: Click the calendar icon in your browser toolbar
2. **Floating Button**: Use the floating calendar button on any webpage
3. **Keyboard Shortcut**: Press `Alt + C` on any webpage

### Creating Events

1. **Voice Input**: Click the microphone button and speak naturally
   - "Schedule a team meeting tomorrow at 2 PM"
   - "Add a weekly standup every Monday at 9 AM for 8 weeks"

2. **Manual Entry**: Use the traditional form interface
   - Fill in title, description, date/time
   - Set recurring patterns and duration

### Managing Recurring Events

When editing or deleting recurring events, you'll see a dialog asking:
- **"This event only"** - Affects just the selected occurrence
- **"All events in series"** - Affects the entire recurring series

### Notifications

The extension automatically monitors your events and shows notifications:
- **Red notifications**: Events starting in 15 minutes
- **Orange notifications**: Events starting in 1 hour  
- **Blue notifications**: Tomorrow's events (morning reminder)

## File Structure

```
├── manifest.json              # Extension manifest
├── extension/
│   ├── popup.html            # Extension popup interface
│   ├── popup.js              # Popup logic and app loading
│   ├── background.js         # Background script for notifications
│   ├── content.js            # Content script for webpage integration
│   └── icons/                # Extension icons (16, 48, 128px)
├── client/                   # React frontend
├── server/                   # Express.js backend
└── shared/                   # Shared types and schemas
```

## Technical Architecture

### Extension Components

1. **Popup (popup.html/js)**
   - Loads the full calendar app in an iframe
   - Handles server detection and connection testing
   - Responsive 400x600px interface

2. **Background Script (background.js)**
   - Monitors events for upcoming notifications
   - Handles periodic checks every 5 minutes
   - Shows Chrome notifications for reminders

3. **Content Script (content.js)**
   - Adds floating button to all webpages
   - Provides keyboard shortcut (Alt + C)
   - Quick access without opening new tabs

### Security & Permissions

- `storage`: Store user preferences and cached data
- `activeTab`: Access current tab for Replit domain detection
- `notifications`: Show event reminders
- `background`: Run periodic event checking
- `host_permissions`: Access calendar server (localhost and Replit)

### Cross-Origin Integration

The extension handles CORS by:
- Loading the calendar app in an iframe
- Using `credentials: 'include'` for authenticated requests
- Supporting both localhost development and Replit production

## Development

### Local Development Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Make changes to extension files
3. Go to `chrome://extensions/` and click "Reload" on the extension
4. Test changes in the extension popup

### Production Deployment

1. Deploy your calendar app to Replit or another hosting service
2. Update `manifest.json` with your production domain
3. Package the extension for Chrome Web Store submission

## Troubleshooting

### Extension Won't Connect
- Ensure the calendar server is running
- Check the browser console for connection errors
- Verify the server URL in `popup.js`

### Authentication Issues
- Clear browser cookies and storage
- Sign up for a new account in the extension popup
- Check server logs for authentication errors

### Notifications Not Working
- Grant notification permissions when prompted
- Check Chrome notification settings
- Ensure background script permissions are enabled

## Browser Compatibility

- **Chrome**: Full support (recommended)
- **Edge**: Manifest V3 compatible
- **Firefox**: Requires manifest conversion to V2
- **Safari**: Not supported (different extension system)

## Privacy & Data

- All calendar data is stored on your server
- No data is shared with third parties
- Voice recordings are processed by OpenAI Whisper API
- Extension only accesses necessary permissions

## Support

For issues or feature requests, check the server logs and browser console for detailed error messages.