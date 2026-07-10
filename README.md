# Kick.com User Selector

A browser extension for Kick.com that allows you to replace usernames in API requests when clicking on usernames in the Kick.com interface. This is particularly useful for streamers and moderators who want to interact with specific users programmatically or gift the sub for a user is not in the chat that time.

## Features

- Click on any username in Kick.com interface to set a target username
- Automatically rewrites API requests to replace the clicked username with your target username
- Works with Kick's API endpoints for channel/user interactions
- Simple popup interface to set and manage your target username
- Persistent storage of your target username using Chrome storage
- Works on all Kick.com pages

## Installation

### For Chrome/Edge/Brave:
1. Download or clone this repository
2. Open Chrome/Edge/Brave and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `KickSUB` folder from this repository
5. The extension icon should appear in your toolbar

### For Firefox:
1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" -> "Load Temporary Add-on"
4. Select the `manifest.json` file in the `KickSUB` folder
5. The extension icon should appear in your toolbar

## Usage

1. Navigate to any Kick.com page (kick.com)
2. Click the extension icon in your toolbar to open the popup
3. Enter the username you want to target in the input field
4. Click the "Set" button to save your target username
5. Navigate to any Kick.com page with visible usernames (chat, follower lists, etc.)
6. Click on any username - the extension will intercept API calls and replace that username with your target username
7. A brief "Saved" confirmation will appear when you set a username
6. Use the "Clear" button to remove your target username

## How It Works

The extension works by intercepting click events on username elements in the Kick.com interface. When you click a username:

1. It captures the clicked username
2. It temporarily stores your target username as a replacement
3. It intercepts subsequent `fetch` and `XMLHttpRequest` calls to Kick's API
4. It rewrites URLs matching the pattern `/api/v2/channels/{channel}/users/{username}` to replace the clicked username with your target
5. The replacement is active for a short window (1 second) after each click

This allows you to effectively "impersonate" a specific user in API interactions without actually logging in as that user.

## Files

- `manifest.json` - Extension configuration and permissions
- `popup.html` - Popup UI for setting target username
- `popup.js` - Popup logic for saving/getting username
- `background.js` - Service worker that injects content script on tab updates
- `content_script.js` - Script injected into Kick.com pages to handle username clicks and API interception
- `icons/icon.png` - Extension icon

## Permissions Explained

The extension requests these permissions:
- `storage`: To save your target username between sessions
- `scripting`: To inject scripts into Kick.com tabs
- `activeTab`: To interact with the currently active tab
- `tabs`: To monitor tab updates
- `http://*/*` and `https://*/*`: To intercept API requests on all websites (limited to Kick.com domains in practice)

## Privacy Notice

This extension only intercepts and modifies API requests to Kick.com domains. It does not collect, transmit, or store any personal data beyond your target username (stored locally in your browser). No data is sent to external servers.

## Disclaimer

This tool is intended for legitimate uses such as stream moderation, bot testing, and development purposes. Please use responsibly and in accordance with Kick's Terms of Service. The developers are not responsible for any misuse of this extension.

## Contributing

Feel free to submit issues or pull requests if you'd like to improve this extension.

## License

MIT License - feel free to use and modify as needed.