# 🔐 Telegram Authentication Setup Guide

## Overview

TGfetch now uses a **clean, secure authentication flow** where API credentials are hardcoded in the Electron main process and never exposed to the renderer. Users only see a simple "Connect Telegram" button.

## 🚀 Quick Setup

### 1. Get Your Telegram API Credentials

1. Visit [https://my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your phone number
3. Create a new application (if you haven't already)
4. Note down your:
   - **API ID** (numeric)
   - **API Hash** (32-character hex string)

### 2. Configure API Credentials

Open `electron/main.ts` and replace the placeholder values around **line 34**:

```typescript
/**
 * 🔐 SECURITY: API credentials are hardcoded here and NEVER exposed to renderer.
 * These credentials are used exclusively in the main process for Telegram authentication.
 * 
 * ⚠️ IMPORTANT: Replace these with your actual Telegram API credentials from:
 * https://my.telegram.org/apps
 */
const API_ID = 123456 // Replace with your API ID
const API_HASH = 'your_api_hash_here' // Replace with your API Hash
```

**Example:**
```typescript
const API_ID = 9876543
const API_HASH = 'abcdef1234567890abcdef1234567890'
```

### 3. Build and Run

```bash
npm run build
npm run build:linux  # or build:win for Windows
```

That's it! Your users will never see or need to enter these credentials.

---

## 🏗️ Architecture Overview

### Authentication State Machine

The auth system uses a clean state machine with these states:

| State | Description |
|-------|-------------|
| `idle` | Not connected, no session exists |
| `restoring` | Attempting to restore saved session on app start |
| `connecting` | Initiating new connection |
| `waiting_for_phone` | Waiting for user to enter phone number |
| `waiting_for_code` | Waiting for OTP verification code |
| `waiting_for_password` | Waiting for 2FA password (if enabled) |
| `authenticated` | Successfully authenticated |
| `error` | Error occurred during authentication |

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                         │
│  • Stores API_ID and API_HASH                           │
│  • Manages TelegramClient                               │
│  • Handles authentication flow                          │
│  • Saves/loads session from userData                    │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
         IPC Bridge                  IPC Events
      (contextBridge)            (auth-status updates)
              │                           │
┌─────────────┴───────────────────────────┴───────────────┐
│                 Renderer Process                        │
│  • Displays "Connect Telegram" button                   │
│  • Shows AuthDialog based on auth status                │
│  • Submits phone/code/password when requested           │
│  • Never sees API credentials                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Features

### ✅ What's Secure

1. **API credentials never leave main process**
   - Hardcoded in main.ts
   - Not accessible from renderer
   - Not logged or exposed

2. **Session persistence**
   - Saved as encrypted string in `userData/session.json`
   - Auto-restored on app start
   - Deleted on logout

3. **No credential storage in renderer**
   - User only enters phone/code/password during login
   - These are immediately passed to main process
   - Not persisted in renderer state

4. **Context isolation enabled**
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - Explicit IPC whitelist via contextBridge

### 🛡️ Session File Location

Sessions are stored in the platform-specific userData directory:

- **Linux:** `~/.config/tgfetch/session.json`
- **Windows:** `%APPDATA%/tgfetch/session.json`
- **macOS:** `~/Library/Application Support/tgfetch/session.json`

---

## 🎯 User Experience

### First-Time Login Flow

1. User clicks **"Connect Telegram"** button
2. Modal appears requesting **phone number**
3. User enters phone, submits
4. Modal updates to request **verification code**
5. User enters code from Telegram app
6. If 2FA enabled: modal requests **password**
7. Success! Green checkmark, shows connected status

### Subsequent Logins

1. App starts
2. Session auto-restored
3. User sees "Connected" status immediately
4. Ready to download!

### Logout

- Click **"Logout"** button
- Session deleted from disk
- Returns to "Connect Telegram" state

---

## 📡 IPC API Reference

### Methods (Renderer → Main)

```typescript
// Get current auth status
window.tgfetch.auth.getStatus()
// Returns: { status: AuthStatus, phoneNumber?: string, error?: string }

// Check if saved session exists
window.tgfetch.auth.hasSession()
// Returns: boolean

// Restore saved session
window.tgfetch.auth.restoreSession()
// Returns: { success: boolean, error?: string }

// Start new connection
window.tgfetch.auth.connect()
// Returns: { success: boolean, error?: string }

// Submit phone number
window.tgfetch.auth.submitPhone(phone: string)

// Submit verification code
window.tgfetch.auth.submitCode(code: string)

// Submit 2FA password
window.tgfetch.auth.submitPassword(password: string)

// Logout
window.tgfetch.auth.logout()
```

### Events (Main → Renderer)

```typescript
// Listen for auth status changes
window.tgfetch.auth.onStatusChange((payload) => {
  // payload: { status, phoneNumber?, error? }
})
```

---

## 🧪 Testing Authentication

### Test Phone Numbers

For development, Telegram provides test phone numbers:

- **+999 662 XXX XX** (DC 1)
- **+999 661 XXX XX** (DC 2)

Verification code: **22222** (always)

**Note:** Test accounts only work on Telegram test servers. You'll need to configure gramjs accordingly.

### Production Testing

1. Use your real phone number
2. Ensure you have Telegram app installed (to receive codes)
3. Test both login and logout flows
4. Verify session persistence (restart app)

---

## 🐛 Troubleshooting

### "API ID must be a number" Error

- Ensure `API_ID` is a raw number, not a string
- ❌ Wrong: `const API_ID = "123456"`
- ✅ Correct: `const API_ID = 123456`

### "Invalid session" on App Start

- Session file may be corrupted
- Solution: Delete `userData/session.json` and login again
- Or click Logout button to clear properly

### Auth Dialog Not Appearing

- Check browser console for errors
- Ensure `AuthDialog.tsx` is imported in `App.tsx`
- Verify auth status updates are reaching renderer

### FloodWaitError

- You've made too many auth attempts
- Wait the specified duration
- Use different phone number for testing

---

## 📝 Code Quality Checklist

- ✅ Strict TypeScript (no `any`)
- ✅ Modular architecture
- ✅ All Telegram logic in main process
- ✅ Clean IPC separation
- ✅ Comprehensive error handling
- ✅ Session persistence
- ✅ Auto-restore on app start
- ✅ Secure credential storage
- ✅ Animated UI transitions
- ✅ Toast notifications
- ✅ Activity logging

---

## 🎨 UI Components

### Connect Button States

| State | Visual |
|-------|--------|
| Disconnected | Blue gradient button "Connect Telegram" |
| Connecting | Spinner + "Connecting…" |
| Waiting for Phone | Spinner + "Waiting for phone…" |
| Waiting for Code | Spinner + "Waiting for code…" |
| Authenticated | Green badge + phone number + Logout button |

### AuthDialog

- **Backdrop:** Black with blur
- **Modal:** Glassmorphic card with gradient accent
- **Input:** Auto-focused, appropriate keyboard types
- **Submit:** Disabled until input provided
- **Error:** Red banner below input

---

## 🔄 Migration from Old Flow

### What Changed

**Before:**
- Users manually entered API ID and API Hash in UI
- Credentials stored in localStorage
- Security risk: credentials exposed to renderer

**After:**
- API credentials hardcoded in main.ts
- Users only click "Connect Telegram"
- Interactive prompts for phone/code/password
- Credentials never leave main process

### Database/Storage Migration

No migration needed! Old API credentials in localStorage will be ignored. Users just need to click "Connect Telegram" once.

---

## 📚 Additional Resources

- [GramJS Documentation](https://gram.js.org/)
- [Telegram API Documentation](https://core.telegram.org/api)
- [Telegram MTProto](https://core.telegram.org/mtproto)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)

---

## 🤝 Contributing

When contributing authentication-related changes:

1. Never log credentials or session strings
2. Never expose API_ID or API_HASH to renderer
3. Always handle errors gracefully
4. Update state machine if adding new states
5. Add toast notifications for user feedback
6. Test session persistence

---

## 📄 License

This authentication implementation follows Telegram's terms of service and API usage guidelines.

**⚠️ Important:** Each developer must use their own API credentials. Do not share your API_ID and API_HASH publicly.

---

**Last Updated:** March 3, 2026  
**Version:** 2.0.0 (Clean Auth Flow)
