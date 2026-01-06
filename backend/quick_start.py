"""
Quick start script with progress indication
Shows what's happening during the slow first-time setup
"""

print("=" * 60)
print("  DocuSearch Pro - Backend Startup")
print("=" * 60)
print()
print("⚠️  FIRST TIME SETUP:")
print("   This will download a 500MB AI model (one-time only)")
print("   It may take 2-5 minutes depending on your internet speed")
print("   After first run, startup will be instant!")
print()
print("=" * 60)
print()

import sys
import time

# Step 1: Import FastAPI (fast)
print("[1/4] Loading FastAPI...", end=" ", flush=True)
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import tempfile
import os
import shutil
import re
print("✅")

# Step 2: Try magic import
print("[2/4] Checking file validation...", end=" ", flush=True)
try:
    import magic
    MAGIC_AVAILABLE = True
    print("✅ (python-magic available)")
except ImportError:
    MAGIC_AVAILABLE = False
    print("⚠️  (using fallback - this is OK)")

# Step 3: Import RAG engine (THIS IS SLOW on first run)
print("[3/4] Loading AI models (this may take 2-5 min on first run)...")
print("      Downloading embedding model from HuggingFace...")
print("      Progress: ", end="", flush=True)

# Show a progress spinner
import threading
stop_spinner = False

def spinner():
    chars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    idx = 0
    while not stop_spinner:
        print(f"\r      Progress: {chars[idx % len(chars)]} ", end="", flush=True)
        idx += 1
        time.sleep(0.1)
    print("\r      Progress: ✅ Done!                    ")

spinner_thread = threading.Thread(target=spinner, daemon=True)
spinner_thread.start()

from rag_engine import PaperQA

stop_spinner = True
time.sleep(0.2)  # Let spinner finish

print()

# Step 4: Start the server
print("[4/4] Starting web server on http://0.0.0.0:8000...", end=" ", flush=True)

# Import the configured app from api.py
import api
print("✅")

print()
print("=" * 60)
print("  ✅ Backend is ready!")
print("=" * 60)
print()
print("  Server running at: http://localhost:8000")
print("  API docs at:       http://localhost:8000/docs")
print()
print("  Next steps:")
print("  1. Open frontend at http://localhost:5173")
print("  2. Enter your Groq API key")
print("  3. Upload PDFs and start asking questions!")
print()
print("=" * 60)
print()

# Start uvicorn
import uvicorn
uvicorn.run(api.app, host="0.0.0.0", port=8000)
