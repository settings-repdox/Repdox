# Registration Portal Configuration

## ⚠️ CRITICAL FIX: Supabase Credentials Configuration

### The Problem

The registration portal was using **hardcoded Supabase credentials from a different project**, causing all registrations to be saved to an incorrect database. This is why registrations weren't appearing in:

- The Supabase `event_registrations` table
- The organizer's event page registrations view

**Root Cause:** The portal was pointing to `https://igghkfselpqlyktsiulj.supabase.co` instead of your actual Supabase project.

### The Solution

The registration portal now uses a **configuration file** (`env-config.js`) that must be updated with your correct Supabase credentials.

---

## Setup Instructions

### 1. Quick Setup (Recommended)

If you have environment variables set in your `.env` file, run the automated setup script:

```bash
cd registration-portal
source ../.env  # Load environment variables
./setup-registration-portal.sh
```

This script will automatically generate `env-config.js` with your correct credentials.

### 2. Manual Setup

If you prefer to configure manually:

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Settings → API** in your project
3. Copy these values:
   - **Project URL** (VITE_SUPABASE_URL)
   - **Anon Public Key** (VITE_SUPABASE_ANON_KEY)

4. Edit `env-config.js` and update:

```javascript
window.REGISTRATION_CONFIG = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key-here",
  DEBUG: false,
};
```

### 3. Verification

After configuration:

1. Open `index.html` in your browser
2. Submit a test registration
3. Check your Supabase dashboard:
   - Go to **Database → event_registrations**
   - You should see the new registration
4. Organizer can see it in the event page registration list

---

## Production Deployment (Vercel)

For Vercel deployment:

1. Add environment variables in **Vercel Dashboard:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Create a `vercel.json` or build script that runs:

```bash
./setup-registration-portal.sh
```

3. Alternatively, you can use a Vercel build script:

```json
{
  "buildCommand": "cd registration-portal && ./setup-registration-portal.sh && cd .."
}
```

---

## Troubleshooting

### Error: "Configuration Error - Supabase credentials not configured"

**Solution:** Make sure `env-config.js` exists and has valid credentials:

```bash
# Check if file exists
ls -la env-config.js

# Check contents (first few lines should show your URL)
head -20 env-config.js
```

### Registrations still not appearing

1. Check browser console for errors (F12 → Console tab)
2. Verify the Supabase URL matches your project:
   ```javascript
   // In browser console:
   console.log(window.REGISTRATION_CONFIG);
   ```
3. Confirm the event exists in your Supabase `events` table
4. Check Supabase RLS policies - they might be blocking inserts

### "No events found in your database"

- Create an event in your Supabase `events` table first
- The portal fetches the latest event and registers users for it

---

## File Structure

```
registration-portal/
├── index.html                    # Main HTML
├── main.js                       # Form logic (fixed)
├── style.css                     # Styling
├── env-config.js                 # Configuration (UPDATE THIS!)
├── setup-registration-portal.sh  # Auto-setup script
└── README.md                     # This file
```

---

## Technical Details

### How It Works Now

1. **env-config.js** is loaded first (via `<script>` in `index.html`)
2. It sets `window.REGISTRATION_CONFIG` with your Supabase credentials
3. **main.js** reads from `window.REGISTRATION_CONFIG`
4. Registrations are saved to **your** Supabase project

### Security Notes

- The `env-config.js` contains your **Anon Public Key** (not secret)
- This key has limited permissions (usually just INSERT on registrations)
- Never commit actual credentials to git - use the setup script
- For production, inject credentials via environment variables during build

---

## Questions?

Contact: supportrepdox@gmail.com

---

## Changelog

### v2.0 (Fixed)

- ✅ Removed hardcoded credentials pointing to wrong Supabase project
- ✅ Added configurable env-config.js system
- ✅ Added automatic setup script
- ✅ Added proper error handling and validation
- ✅ Registrations now save to correct Supabase project

### v1.0 (Broken)

- ❌ Hardcoded wrong Supabase credentials
- ❌ Registrations saved to wrong database
- ❌ No way to update credentials without editing code
