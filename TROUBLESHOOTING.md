# Troubleshooting Guide

## "Invalid API Key" Error

If you're getting "Invalid API key" even though you're sure it's correct, follow these steps:

### Step 1: Run the API Key Test Script

```bash
python test_api_key.py
```

This will check:
- ✅ Key length (20-500 chars)
- ✅ Starts with `gsk_`
- ✅ No extra spaces
- ✅ No control characters
- ✅ Actually works with Groq API

### Step 2: Common API Key Issues

#### Issue A: Copy-Paste Problems
**Problem**: Hidden characters or incomplete copy

**Fix**:
1. Go to https://console.groq.com/keys
2. Click "Copy" button (don't manually select)
3. Paste into a text editor first
4. Check it starts with `gsk_`
5. Check there's no extra spaces at start or end
6. Copy from text editor into app

#### Issue B: Expired/Revoked Key
**Problem**: Key was valid but is now expired or revoked

**Fix**:
1. Go to https://console.groq.com/keys
2. Check if your key is listed as "Active"
3. If not active, create a new key
4. Delete the old key to avoid confusion

#### Issue C: Wrong API Key Type
**Problem**: Using OpenAI/Anthropic key instead of Groq

**Fix**:
- ❌ OpenAI keys start with `sk-`
- ❌ Anthropic keys start with `sk-ant-`
- ✅ **Groq keys start with `gsk_`**

Make sure you're using a Groq API key from https://console.groq.com/keys

#### Issue D: Rate Limiting
**Problem**: Too many failed attempts

**Fix**:
Wait 1 minute and try again (rate limit: 5 attempts/minute)

#### Issue E: Network/Firewall Issues
**Problem**: Backend can't reach Groq API

**Symptoms**: Error message says "API validation error: [connection error]"

**Fix**:
1. Check your internet connection
2. Try accessing https://api.groq.com in browser
3. Check if corporate firewall is blocking API calls
4. Try disabling VPN temporarily

### Step 3: Check Backend Logs

When you run the backend, watch the terminal output:

```bash
cd backend
python api.py
```

You should see:
```
🔑 Validating API key: gsk_xxxx...yyyy
📡 Making test call to Groq API...
```

If you see:
- ✅ `✅ API key validated successfully` → API key works!
- ❌ `❌ API key validation failed: 401` → Invalid/expired key
- ❌ `❌ API key validation failed: Connection` → Network issue

### Step 4: Browser Console Errors

1. Open browser DevTools (F12)
2. Go to "Console" tab
3. Click "Initialize System"
4. Look for errors

Common errors:
```javascript
// CORS error - backend not running
Access to XMLHttpRequest at 'http://localhost:8000/init' from origin 'http://localhost:5173' has been blocked

// Fix: Start backend with `python api.py`
```

```javascript
// Network error - wrong backend URL
Failed to fetch

// Fix: Check API_URL in frontend/src/App.jsx is http://localhost:8000
```

---

## Backend Won't Start

### Error: "ImportError: failed to find libmagic"

**Already fixed!** The code has a fallback. Just ignore this warning.

### Error: "ModuleNotFoundError: No module named 'X'"

**Fix**:
```bash
cd backend
pip install -r requirements.txt
```

### Error: "Port 8000 already in use"

**Fix**:
```bash
# Windows: Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# Or change port in backend/api.py line 395:
uvicorn.run(app, host="0.0.0.0", port=8001)  # Change 8000 to 8001
```

---

## Frontend Won't Start

### Error: "npm: command not found"

**Fix**: Install Node.js from https://nodejs.org

### Error: "Cannot find module"

**Fix**:
```bash
cd frontend
rm -rf node_modules
npm install
```

---

## Upload Fails

### Error: "File too large"

**Limits**:
- Max 10MB per PDF
- Max 50MB total upload

**Fix**: Compress PDFs or split into smaller files

### Error: "Invalid file type"

**Fix**: Only PDF files are allowed (for security)

### Error: "Rate limit exceeded"

**Fix**: Upload limit is 10 files/hour. Wait and try again.

---

## Query Fails

### Error: "Call /init first"

**Fix**: You need to initialize the system with your API key first

### Error: "Upload files first"

**Fix**: You need to upload at least one PDF before querying

### Error: "Rate limit exceeded"

**Fix**: Query limit is 30/minute (1 every 2 seconds). Slow down.

---

## Getting More Help

1. **Check the logs**: Backend terminal shows detailed errors
2. **Browser console**: F12 → Console tab
3. **Test API key**: Run `python test_api_key.py`
4. **GitHub Issues**: https://github.com/dricado888/DocuSearch/issues

---

## Quick Diagnostic

Run this checklist:

- [ ] Backend running? (`python backend/api.py`)
- [ ] Frontend running? (`cd frontend && npm run dev`)
- [ ] Browser at http://localhost:5173?
- [ ] API key starts with `gsk_`?
- [ ] API key from https://console.groq.com/keys?
- [ ] Internet connection working?
- [ ] No firewall blocking Groq API?

If all checked and still failing, run `python test_api_key.py` and share the output.
