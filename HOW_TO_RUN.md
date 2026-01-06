# How to Run DocuSearch Pro

## Quick Start (Windows)

### Option 1: Double-Click Batch Files (Easiest)

1. **Start Backend**: Double-click `start_backend.bat`
   - Opens on http://localhost:8000
   - Keep this window open

2. **Start Frontend**: Double-click `start_frontend.bat`
   - Opens on http://localhost:5173
   - Keep this window open

3. **Open Browser**: Go to http://localhost:5173

---

### Option 2: Manual Command Line

#### Terminal 1 - Backend
```bash
cd backend
python api.py
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

---

## First Time Setup

### 1. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Create .env File
Create `backend/.env` with your Groq API key:
```
GROQ_API_KEY=gsk_your_key_here
```

**⚠️ IMPORTANT**: Never commit the `.env` file to Git!

---

## Using the Application

### Step 1: Initialize
1. Enter your Groq API key
2. Click "Initialize System"

### Step 2: Upload PDFs
1. Click "Upload Files"
2. Select one or more PDF files (max 10MB each, 50MB total)
3. Wait for processing

### Step 3: Ask Questions
1. Type your question in the text box
2. Adjust number of sources (1-10)
3. Click "Ask Question"

---

## Security Features 🔒

Your app now includes production-grade security:

✅ **Rate Limiting**
- Upload: 10 files/hour
- Query: 30 questions/minute
- Init: 5 attempts/minute

✅ **File Validation**
- Extension check (.pdf only)
- Size limits (10MB per file)
- Magic number check (prevents fake PDFs)
- Path traversal prevention

✅ **Input Validation**
- Question length: 3-1000 characters
- XSS prevention
- Control character filtering

✅ **Security Headers**
- XSS Protection
- Clickjacking prevention
- MIME sniffing prevention
- Content Security Policy

✅ **CORS Hardening**
- Whitelist origins only
- Specific methods (GET, POST)
- Specific headers only

---

## Troubleshooting

### Backend won't start
```bash
# Check Python version (need 3.8+)
python --version

# Reinstall dependencies
cd backend
pip install --upgrade -r requirements.txt
```

### Frontend won't start
```bash
# Clear node modules and reinstall
cd frontend
rm -rf node_modules
npm install
```

### "Failed to connect to backend" error
1. Make sure backend is running on port 8000
2. Check browser console for CORS errors
3. Verify CORS origins in `backend/api.py` line 162

### Rate limit errors
If you're testing and hitting rate limits:
1. Wait a few minutes
2. Or temporarily increase limits in `backend/api.py` lines 43-50

---

## Project Structure

```
docusearch-pro/
├── backend/
│   ├── api.py              # FastAPI server with security
│   ├── rag_engine.py       # RAG processing logic
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   └── App.jsx         # React UI
│   ├── package.json        # Node dependencies
│   └── vite.config.js      # Vite config
├── start_backend.bat       # Quick start backend
├── start_frontend.bat      # Quick start frontend
└── SECURITY_IMPROVEMENTS.md # Security documentation
```

---

## Documentation

- **Security Details**: See [SECURITY_IMPROVEMENTS.md](SECURITY_IMPROVEMENTS.md)
- **Quick Security Reference**: See [SECURITY_IMPLEMENTATION_SUMMARY.md](SECURITY_IMPLEMENTATION_SUMMARY.md)

---

## Need Help?

Check the project on GitHub: https://github.com/dricado888/DocuSearch
