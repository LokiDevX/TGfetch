# ⚡ Quick Start Guide

## 🎯 What Changed?

**Before:** Users entered API ID and API Hash in the UI  
**After:** Users just click "Connect Telegram" and follow prompts

## 🚀 5-Minute Setup

### Step 1: Get Telegram API Credentials
Visit [https://my.telegram.org/apps](https://my.telegram.org/apps) and create an app.

### Step 2: Update main.ts
Open `electron/main.ts` (line 34) and replace:

```typescript
const API_ID = 123456  // Your API ID
const API_HASH = 'your_api_hash_here'  // Your API Hash
```

### Step 3: Build & Run
```bash
npm run build
npm run build:linux
```

Done! 🎉

## 📸 What Users See

### Login Flow
1. Click **"Connect Telegram"** button
2. Enter phone number → Submit
3. Enter code from Telegram app → Submit
4. (If 2FA) Enter password → Submit
5. See green "Connected" badge with phone number

### Authenticated State
```
┌────────────────────────────────────┐
│ 🌐 Connected to Telegram          │
│ +1 415 555 2671         [Logout]  │
└────────────────────────────────────┘
```

## 🔑 Key Files Changed

| File | What Changed |
|------|--------------|
| `electron/main.ts` | Added API credentials, auth state machine |
| `electron/preload.ts` | New auth IPC methods |
| `src/pages/Dashboard.tsx` | Removed API input fields, added Connect button |
| `src/components/AuthDialog.tsx` | Auto-shows based on auth state |
| `src/store/downloadStore.ts` | Updated auth state structure |
| `src/types/global.d.ts` | New AuthStatus type |

## 🎨 New UI Components

### Connect Button (Dashboard)
- **Idle:** Blue gradient "Connect Telegram"
- **Connecting:** Spinner animation
- **Authenticated:** Green badge + logout

### Auth Modal (Auto-appears)
- **Phone:** Input with country code hint
- **Code:** OTP from Telegram app
- **Password:** 2FA password (if enabled)

## 📡 New IPC API

```typescript
// In renderer (React components)

// Start connection
await window.tgfetch.auth.connect()

// Submit credentials during flow
await window.tgfetch.auth.submitPhone('+14155552671')
await window.tgfetch.auth.submitCode('12345')
await window.tgfetch.auth.submitPassword('mypassword')

// Listen for status changes
window.tgfetch.auth.onStatusChange((payload) => {
  console.log(payload.status) // 'authenticated', 'waiting_for_phone', etc.
})

// Logout
await window.tgfetch.auth.logout()
```

## 🔐 Security Improvements

✅ API credentials never exposed to renderer  
✅ Session auto-restored on app start  
✅ Proper logout with cleanup  
✅ Context isolation enforced  

## 🐛 Troubleshooting

**Auth dialog not showing?**  
Check that `<AuthDialog />` is rendered in your App component.

**Session not persisting?**  
Check `~/.config/tgfetch/session.json` (Linux) exists after login.

**"Invalid session" error?**  
Delete session file and login again: `rm ~/.config/tgfetch/session.json`

## 📚 Full Documentation

- **Setup Guide:** [AUTH_SETUP.md](./AUTH_SETUP.md)
- **Implementation Details:** [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md)

## ✅ Testing

```bash
# 1. Start dev server
npm run dev

# 2. Click "Connect Telegram"
# 3. Enter your phone number
# 4. Enter code from Telegram
# 5. Verify green "Connected" status
# 6. Restart app - should auto-connect
# 7. Click "Logout" - should return to disconnected
```

## 🎉 That's It!

Your app now has a production-ready, secure Telegram authentication flow!

---

**Need Help?** Check [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed troubleshooting.
