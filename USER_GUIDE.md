# TGfetch Premium - User Guide

## 🚀 Getting Started

### First Time Setup

1. **Launch TGfetch**
   ```bash
   npm run dev  # Development
   # or
   npm run build && ./release/TGfetch-1.0.0.AppImage  # Production
   ```

2. **Connect to Telegram**
   - You'll see the Dashboard with two login options:
     - **Login with QR** (Recommended) 
     - **Use Phone Number** (Fallback)

---

## 📱 QR Login (Fast & Secure)

### Method 1: QR Code Login

1. Click **"Login with QR"** button on Dashboard
2. A QR code will appear in a modal
3. Open Telegram on your phone
4. Go to: **Settings → Devices → Link Desktop Device**
5. Scan the QR code
6. Done! ✨

**Features:**
- No need to type anything
- Instant authentication
- QR auto-refreshes every 60 seconds
- Secure token-based login

**If QR expires:**
- The modal will show "QR code expired"
- Click "Use phone number instead" to fallback

---

## 📞 Phone Login (Fallback)

### Method 2: Phone Number Login

1. Click **"Use Phone Number"** button
2. Enter your phone number with country code (e.g., `+1 415 555 2671`)
3. Click Submit
4. Check Telegram app for verification code
5. Enter the code
6. If 2FA enabled, enter your password
7. Done!

---

## 🎯 Main Workflow

### Step 1: Browse Your Channels

1. After login, click **"Browse Channels"** card on Dashboard
2. Or click **"My Channels"** in the sidebar
3. You'll see a grid of all your joined channels

**Each channel card shows:**
- Channel name
- Username (if public)
- Private/Public badge
- Member count

### Step 2: Select a Channel

1. Click any channel card
2. You'll be taken to the **Media Browser**

### Step 3: Browse Media

**View Options:**
- Click Grid icon (top right) for thumbnail view
- Click List icon for compact list view

**Filter Options:**
- All Media (default)
- Videos only
- Photos only
- Documents only
- Audio only

### Step 4: Download Files

**Option A: Download Single File**
1. Hover over any media card
2. Click the **Download button** that appears
3. File downloads immediately

**Option B: Download Multiple Files**
1. Click checkboxes on files you want
2. Or click **"Select All"** to select everything
3. Click **"Download (X)"** button in toolbar
4. All selected files download concurrently

**Progress:**
- Real-time progress bar for each file
- Overall progress counter
- Speed and ETA indicators
- Toast notifications on completion

---

## 📊 Dashboard Features

### Stats Cards

- **Total Channels**: How many channels you've joined
- **Files Downloaded**: Total files downloaded ever
- **Last Download**: Date of your last download session

### Quick Actions

- **Browse Channels** → Jump to channel browser
- **View History** → See past download sessions

### Recent Downloads

- Shows last 3 download sessions
- Click "View All" to see full history

---

## 🎨 UI Features

### Sidebar Navigation

- **Dashboard**: Home page with stats
- **My Channels**: Browse joined channels
- **History**: View download history
- **Settings**: App settings
- **Disconnect**: Logout from Telegram

**Collapse/Expand:**
- Click chevron button at bottom of sidebar
- Saves your preference

### Media Browser Toolbar

**Top Controls:**
- **Back button**: Return to channel list
- **View toggle**: Switch between grid/list
- **Filter dropdown**: Filter by media type
- **Select All**: Select all visible media
- **Clear Selection**: Deselect all
- **Download (X)**: Download selected files

### Activity Log

- Shows real-time download progress
- Success/error messages
- File-by-file status
- Can be toggled open/closed

---

## ⚡ Performance Tips

### For Faster Downloads

1. **Concurrency**: App downloads 5 files at once automatically
2. **Select Folder**: Choose a fast local drive (not network)
3. **Filter First**: Use media filters to reduce unnecessary downloads
4. **Stable Internet**: Ensure good connection for Telegram API

### If Downloads Slow Down

- Telegram has rate limits (flood control)
- App automatically waits and retries
- You'll see "Rate limited. Waiting Xs..." message
- This is normal and handled gracefully

---

## 🔐 Security & Privacy

### Data Storage

- **Session**: Encrypted and stored locally
- **Download Path**: Saved in app settings
- **API Credentials**: Never exposed to UI

### What Gets Stored

- Telegram session (for auto-login)
- Download folder preference
- Theme preference
- Download history metadata

### What's NOT Stored

- Your password
- Messages content
- QR tokens
- API credentials

---

## 🆘 Troubleshooting

### QR Code Not Working

**Problem**: QR code expired or won't scan

**Solution**: 
1. Click "Use phone number instead"
2. Complete phone login flow
3. QR will work on next login

---

### Can't See Channels

**Problem**: Channel list is empty

**Solution**:
1. Join channels on Telegram app first
2. Click "Refresh" button in TGfetch
3. Make sure you're authenticated

---

### Download Fails

**Problem**: "Download failed" error

**Solution**:
1. Check internet connection
2. Make sure download folder is writable
3. Check if Telegram has rate-limited you (wait a bit)
4. Try downloading fewer files at once

---

### Authentication Issues

**Problem**: Can't login or session expired

**Solution**:
1. Click "Logout" in sidebar
2. Try QR login first
3. If QR fails, use phone number
4. Check if phone number includes country code

---

## 🎓 Pro Tips

### Organizing Downloads

1. **Create folders**: Set different download paths per session
2. **Use History**: Track where files were downloaded
3. **Filter first**: Use media type filters before selecting all

### Keyboard Shortcuts

- **Not implemented yet** (coming in future update)

### Search

- **Not implemented yet** (coming in future update)

---

## 📱 System Requirements

### Minimum

- **OS**: Linux (Ubuntu 20.04+), Windows 10+, macOS 10.15+
- **RAM**: 2 GB
- **Storage**: 500 MB for app + space for downloads
- **Internet**: Stable connection for Telegram API

### Recommended

- **RAM**: 4 GB or more
- **Storage**: SSD for faster downloads
- **Internet**: Broadband (5+ Mbps)

---

## 🔄 Update Guide

### Checking for Updates

1. Go to **Settings** page
2. Look for app version at bottom
3. Check GitHub releases for newer versions

### Installing Updates

1. Download latest release
2. Extract and replace old files
3. Your saved session and settings persist

---

## 🐛 Known Issues

1. **Thumbnail Loading**: Shows icons instead of actual thumbnails
2. **Photo Sizes**: Display as "0 B" (Telegram API limitation)
3. **Large Channels**: Only fetches first 200 media items (pagination coming soon)

---

## 📞 Support

### Need Help?

- **GitHub Issues**: Report bugs or request features
- **Logs**: Check Activity Log in app for error details
- **Community**: Join Telegram group (if available)

### Reporting Bugs

Please include:
1. TGfetch version
2. Operating system
3. Steps to reproduce
4. Error message (from Activity Log)
5. Screenshot (if relevant)

---

## 🎉 Enjoy!

TGfetch Premium gives you a seamless, modern way to manage Telegram media. No more copying channel IDs, no friction, just beautiful downloads.

**Happy downloading! 🚀**
