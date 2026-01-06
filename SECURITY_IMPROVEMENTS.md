# Security Improvements - DocuSearch Pro

**Date:** January 5, 2026
**Approach:** Add security layers to existing app without breaking functionality
**Goal:** Production-ready security following OWASP Top 10 best practices

---

## Table of Contents

1. [Security Audit - Current State](#security-audit---current-state)
2. [Improvements to Implement](#improvements-to-implement)
3. [Detailed Implementation](#detailed-implementation)
4. [Alternative Approaches Considered](#alternative-approaches-considered)
5. [Testing Security](#testing-security)
6. [Ongoing Security Maintenance](#ongoing-security-maintenance)

---

## Security Audit - Current State

### ✅ What's Already Secure

1. **API Key Validation (Added Recently)**
   - ✅ Validates Groq API key before allowing operations
   - ✅ Prevents invalid keys from proceeding
   - ✅ Returns appropriate HTTP status codes (401, 403)

2. **Environment Variables**
   - ✅ .gitignore excludes .env files
   - ✅ Secrets not committed to repository

3. **Unicode Encoding Protection**
   - ✅ Strips non-ASCII characters to prevent encoding attacks

### ❌ Current Vulnerabilities

1. **No Rate Limiting**
   - **Risk:** Attacker can spam API endpoints
   - **Impact:** Server crashes, high costs, DOS attack
   - **Severity:** HIGH

2. **No Input Validation**
   - **Risk:** Malicious data can break the system
   - **Impact:** Crashes, data corruption, injection attacks
   - **Severity:** HIGH

3. **No File Upload Restrictions**
   - **Risk:** Upload malicious files, huge files
   - **Impact:** Server storage full, malware execution
   - **Severity:** CRITICAL

4. **Weak CORS Configuration**
   - **Risk:** Any website can call your API
   - **Impact:** CSRF attacks, data theft
   - **Severity:** MEDIUM

5. **Missing Security Headers**
   - **Risk:** XSS, clickjacking, MIME sniffing attacks
   - **Impact:** User data stolen, session hijacking
   - **Severity:** MEDIUM

6. **Error Messages Leak Info**
   - **Risk:** Stack traces reveal system details
   - **Impact:** Attackers learn your tech stack
   - **Severity:** LOW

7. **No Request Size Limits**
   - **Risk:** Attacker sends huge payloads
   - **Impact:** Memory exhaustion, crash
   - **Severity:** MEDIUM

8. **No API Key Storage Validation**
   - **Risk:** API keys in plain text memory
   - **Impact:** Memory dumps reveal secrets
   - **Severity:** LOW

---

## Improvements to Implement

### Priority 1: CRITICAL (Implement First)

1. **File Upload Validation**
   - Max file size: 10MB per file
   - Allowed types: PDF only
   - Filename sanitization
   - Virus scanning (optional)

2. **Rate Limiting**
   - Per-IP limits on all endpoints
   - Prevents brute force attacks
   - Prevents resource exhaustion

3. **Input Validation**
   - Validate all request bodies
   - Sanitize user inputs
   - Schema validation with Pydantic

### Priority 2: HIGH (Implement Second)

4. **Security Headers**
   - Content Security Policy (CSP)
   - X-Frame-Options (prevent clickjacking)
   - X-Content-Type-Options (prevent MIME sniffing)
   - Strict-Transport-Security (force HTTPS)

5. **CORS Hardening**
   - Whitelist specific origins
   - Restrict HTTP methods
   - No wildcard credentials

6. **Request Size Limits**
   - Max body size: 50MB
   - Max headers size: 8KB
   - Timeout after 30 seconds

### Priority 3: MEDIUM (Nice to Have)

7. **Error Handling**
   - Generic error messages to users
   - Detailed logs for developers
   - No stack traces in production

8. **Environment Variable Validation**
   - Check all required vars on startup
   - Fail fast if missing
   - Type validation

9. **Content Validation**
   - Check PDF files are actually PDFs
   - Scan for malicious content
   - Reject password-protected PDFs

---

## Detailed Implementation

### 1. Rate Limiting

**What it does:** Limits how many requests a user can make in a time window

**Why we need it:**
- Prevents DOS attacks (100,000 requests/second = crash)
- Prevents brute force attacks (try all API keys)
- Reduces costs (each request = money)

**Alternatives Considered:**

| Approach | Pros | Cons | Why Not Chosen |
|----------|------|------|----------------|
| **slowapi (Chosen)** | ✅ Python-native<br>✅ FastAPI integration<br>✅ Redis-based (scalable) | ❌ Requires Redis | **CHOSEN:** Best FastAPI support |
| nginx rate limiting | ✅ Very fast<br>✅ Built into nginx | ❌ Requires nginx<br>❌ Harder to configure | Need infrastructure change |
| Custom middleware | ✅ Full control<br>✅ No dependencies | ❌ Easy to mess up<br>❌ Not tested | Don't reinvent the wheel |
| Cloud rate limiting | ✅ Managed service<br>✅ DDoS protection | ❌ Expensive<br>❌ Vendor lock-in | Not for MVP |

**Implementation:**

```python
# backend/requirements.txt
slowapi==0.1.9
redis==5.0.1

# backend/api.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Create limiter instance
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to endpoints
@app.post("/init")
@limiter.limit("5/minute")  # 5 requests per minute per IP
async def initialize(request: Request, init_request: InitRequest):
    # ... existing code
```

**Configuration Choices:**

| Endpoint | Limit | Reasoning |
|----------|-------|-----------|
| `/init` | 5/minute | Rarely called, expensive (API validation) |
| `/upload` | 10/hour | File processing is expensive |
| `/query` | 30/minute | Main feature, allow reasonable usage |
| `/status` | 60/minute | Cheap operation, can be frequent |

**Why these limits:**
- **Too strict:** Annoys legitimate users
- **Too loose:** Doesn't stop attacks
- **5/minute for init:** You don't initialize 5 times/minute normally
- **10/hour for upload:** Realistic usage pattern
- **30/minute for query:** ~1 every 2 seconds (reasonable)

**Redis vs In-Memory:**

| Storage | Pros | Cons | Chosen? |
|---------|------|------|---------|
| **In-Memory** | ✅ Simple<br>✅ No setup | ❌ Doesn't scale<br>❌ Lost on restart | For MVP: YES |
| **Redis** | ✅ Persistent<br>✅ Scales across servers | ❌ Extra dependency<br>❌ More complex | For production: YES |

**For MVP:** Start with in-memory, upgrade to Redis when scaling

```python
# In-memory (simple)
limiter = Limiter(key_func=get_remote_address)

# Redis (production)
from slowapi.util import get_remote_address
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379"
)
```

---

### 2. File Upload Security

**What it does:** Validates files before processing them

**Why we need it:**
- User uploads 5GB file → server crashes
- User uploads virus.pdf → malware spreads
- User uploads hack.exe → code execution
- User uploads ../../../../etc/passwd → path traversal

**Alternatives Considered:**

| Approach | Pros | Cons | Why Chosen/Not |
|----------|------|------|----------------|
| **Basic validation (Chosen)** | ✅ Simple<br>✅ Fast<br>✅ No dependencies | ❌ Can be bypassed<br>❌ No virus scan | **CHOSEN:** Good for MVP |
| ClamAV virus scanning | ✅ Real virus detection<br>✅ Open source | ❌ Slow (2-5 sec/file)<br>❌ Heavy resource use | Too slow for UX |
| Cloud scanning (VirusTotal) | ✅ Best detection<br>✅ Multiple engines | ❌ $$$<br>❌ Privacy concerns | Overkill for MVP |
| Magic number validation | ✅ Better than extension<br>✅ Hard to fake | ❌ More complex<br>❌ Still not perfect | Add later if needed |

**Implementation:**

```python
# backend/api.py
from fastapi import UploadFile, HTTPException
import os
import magic  # python-magic for file type detection

# Security constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
ALLOWED_EXTENSIONS = {'.pdf'}
ALLOWED_MIME_TYPES = {'application/pdf'}

async def validate_upload(file: UploadFile) -> None:
    """
    Validate uploaded file for security

    Checks:
    1. File extension is .pdf
    2. MIME type is application/pdf
    3. File size under 10MB
    4. Filename doesn't contain path traversal
    """

    # 1. Validate filename for path traversal
    filename = file.filename
    if '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid filename: path traversal detected"
        )

    # 2. Validate file extension
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only PDF files allowed. Got: {file_ext}"
        )

    # 3. Validate file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()  # Get position (= size)
    file.file.seek(0)  # Reset to beginning

    if file_size > MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=413,  # Payload Too Large
            detail=f"File too large: {size_mb:.2f}MB. Maximum: 10MB"
        )

    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file not allowed"
        )

    # 4. Validate MIME type (magic number check)
    file_content = await file.read(2048)  # Read first 2KB
    file.file.seek(0)  # Reset

    try:
        mime = magic.from_buffer(file_content, mime=True)
        if mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file content. Expected PDF, got: {mime}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="Failed to validate file type"
        )

# Apply to upload endpoint
@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    # Validate each file BEFORE processing
    for file in files:
        await validate_upload(file)

    # ... existing upload code
```

**Why each validation:**

**1. Path Traversal Check:**
```python
if '..' in filename or '/' in filename:
```
- **Attack:** `../../etc/passwd` → access system files
- **Prevention:** Reject any path-like filenames
- **Alternative:** `os.path.basename(filename)` - strips path automatically
- **Chosen:** Explicit rejection is clearer

**2. Extension Check:**
```python
if file_ext not in ALLOWED_EXTENSIONS:
```
- **Attack:** `virus.exe` renamed to `virus.pdf`
- **Prevention:** Only allow .pdf extension
- **Alternative:** Blacklist dangerous extensions (.exe, .sh)
- **Chosen:** Whitelist is safer than blacklist

**3. Size Check:**
```python
if file_size > MAX_FILE_SIZE:
```
- **Attack:** Upload 10GB file → crash server
- **Prevention:** Reject files over 10MB
- **Why 10MB:** Typical academic paper is 1-5MB
- **Alternative:** 50MB, 100MB limits
- **Chosen:** 10MB balances usability and safety

**4. Magic Number Check:**
```python
mime = magic.from_buffer(file_content, mime=True)
```
- **Attack:** Rename virus.exe to virus.pdf (fake extension)
- **Prevention:** Check actual file content (PDF starts with `%PDF`)
- **Alternative:** Just trust extension (BAD!)
- **Chosen:** Content check is harder to bypass

**Filename Sanitization:**

```python
import re
import unicodedata

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent attacks

    Removes:
    - Path separators (/, \)
    - Null bytes
    - Control characters
    - Unicode tricks
    """
    # Remove path components
    filename = os.path.basename(filename)

    # Normalize unicode (prevent homograph attacks)
    filename = unicodedata.normalize('NFKD', filename)

    # Remove control characters
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)

    # Remove dangerous characters
    filename = re.sub(r'[<>:"|?*]', '', filename)

    # Limit length
    name, ext = os.path.splitext(filename)
    if len(name) > 200:
        name = name[:200]

    return f"{name}{ext}"
```

---

### 3. Input Validation with Pydantic

**What it does:** Validates all API request data automatically

**Why we need it:**
- User sends `{"num_sources": "hack"}` → crashes
- User sends `{"question": null}` → error
- User sends 10MB JSON → memory exhausted

**Alternatives Considered:**

| Approach | Pros | Cons | Why Chosen/Not |
|----------|------|------|----------------|
| **Pydantic (Chosen)** | ✅ Built into FastAPI<br>✅ Auto-validates<br>✅ Type safety | ❌ None! | **CHOSEN:** Perfect fit |
| Manual validation | ✅ Full control | ❌ Error-prone<br>❌ Repetitive | Don't reinvent wheel |
| Marshmallow | ✅ Powerful<br>✅ Flexible | ❌ Not FastAPI native<br>❌ More code | Pydantic is better |
| JSON Schema | ✅ Standard<br>✅ Language agnostic | ❌ Verbose<br>❌ Manual checking | Too low-level |

**Implementation:**

```python
# backend/api.py
from pydantic import BaseModel, Field, validator
from typing import Optional

# Enhanced models with validation
class InitRequest(BaseModel):
    api_key: str = Field(
        ...,  # Required
        min_length=20,  # Groq keys are long
        max_length=500,
        description="Groq API key"
    )

    @validator('api_key')
    def validate_api_key_format(cls, v):
        """Validate API key format"""
        # Groq keys start with specific prefix
        if not v.startswith('gsk_'):
            raise ValueError('Invalid API key format. Groq keys start with gsk_')

        # Check for common mistakes
        if v.strip() != v:
            raise ValueError('API key contains leading/trailing spaces')

        return v.strip()

class QueryRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Question to ask about documents"
    )
    num_sources: int = Field(
        default=4,
        ge=1,  # Greater than or equal to 1
        le=10,  # Less than or equal to 10
        description="Number of sources to retrieve"
    )

    @validator('question')
    def validate_question(cls, v):
        """Validate and sanitize question"""
        # Remove excessive whitespace
        v = ' '.join(v.split())

        # Check for minimum meaningful length
        if len(v.strip()) < 3:
            raise ValueError('Question too short. Minimum 3 characters.')

        # Prevent injection attempts (basic)
        dangerous_patterns = ['<script', 'javascript:', 'onerror=']
        for pattern in dangerous_patterns:
            if pattern.lower() in v.lower():
                raise ValueError('Invalid characters in question')

        return v

class RemoveFileRequest(BaseModel):
    filename: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Filename to remove"
    )

    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename for security"""
        # No path traversal
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('Invalid filename: path traversal detected')

        # Must end with .pdf
        if not v.endswith('.pdf'):
            raise ValueError('Filename must end with .pdf')

        return v
```

**Why each validation:**

**Field Constraints:**
```python
Field(min_length=1, max_length=1000)
```
- **Purpose:** Prevent empty inputs and huge payloads
- **min_length=1:** Must have content
- **max_length=1000:** Prevent 1GB text injection
- **Alternative:** No limits (BAD - memory exhaustion)

**Custom Validators:**
```python
@validator('api_key')
def validate_api_key_format(cls, v):
```
- **Purpose:** Business logic validation
- **Checks:** Format, patterns, dangerous content
- **Runs:** Automatically on every request
- **Alternative:** Manual if/else checks (error-prone)

**Numeric Ranges:**
```python
Field(ge=1, le=10)
```
- **Purpose:** Prevent nonsense values
- **ge=1:** Can't ask for 0 or -5 sources
- **le=10:** Can't ask for 1 million sources (DOS)
- **Alternative:** Trust user input (NEVER!)

---

### 4. Security Headers

**What it does:** Tells browsers how to protect users

**Why we need it:**
- XSS attack: `<script>steal cookies</script>`
- Clickjacking: Invisible iframe steals clicks
- MIME sniffing: Browser executes fake image as JS

**Alternatives Considered:**

| Approach | Pros | Cons | Why Chosen/Not |
|----------|------|------|----------------|
| **Manual headers (Chosen)** | ✅ Full control<br>✅ No dependencies<br>✅ FastAPI native | ❌ More code | **CHOSEN:** Simple for FastAPI |
| Starlette middleware | ✅ Built-in<br>✅ Easy | ❌ Limited headers | Not comprehensive enough |
| nginx headers | ✅ Fast<br>✅ Standard | ❌ Requires nginx<br>❌ Can't test locally | Need infrastructure |
| Helmet.js (Node) | ✅ Comprehensive | ❌ Wrong language! | This is Python! |

**Implementation:**

```python
# backend/api.py
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses

    Headers protect against:
    - XSS (Cross-Site Scripting)
    - Clickjacking
    - MIME sniffing
    - Information leakage
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent XSS attacks
        response.headers['X-XSS-Protection'] = '1; mode=block'

        # Prevent clickjacking (iframe attacks)
        response.headers['X-Frame-Options'] = 'DENY'

        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # Force HTTPS (in production)
        # Only enable if you have HTTPS!
        # response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        # Content Security Policy (strict)
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )

        # Don't send referrer to third parties
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Control browser features
        response.headers['Permissions-Policy'] = (
            'geolocation=(), '
            'microphone=(), '
            'camera=()'
        )

        return response

# Add to app
app.add_middleware(SecurityHeadersMiddleware)
```

**Header-by-Header Explanation:**

**1. X-XSS-Protection:**
```python
'X-XSS-Protection': '1; mode=block'
```
- **Attack prevented:** `<script>alert('hacked')</script>` in input
- **What it does:** Browser blocks page if XSS detected
- **Alternative:** `0` (disable) - NEVER do this!
- **Limitation:** Deprecated in modern browsers (CSP better)
- **Why still use:** Protects old browsers

**2. X-Frame-Options:**
```python
'X-Frame-Options': 'DENY'
```
- **Attack prevented:** Clickjacking via invisible iframe
- **What it does:** Prevents your site loading in iframe
- **Alternatives:**
  - `SAMEORIGIN` - Allow same domain iframes
  - `ALLOW-FROM uri` - Allow specific domain
- **Chosen:** `DENY` - strictest security

**3. X-Content-Type-Options:**
```python
'X-Content-Type-Options': 'nosniff'
```
- **Attack prevented:** Browser executes image as JavaScript
- **What it does:** Enforces declared Content-Type
- **Example attack:**
  - Upload `hack.png` (actually JavaScript)
  - Browser "sniffs" content, runs as JS
  - With nosniff: Browser refuses
- **No alternative:** Always use this!

**4. Content-Security-Policy (CSP):**
```python
"default-src 'self'; script-src 'self'; ..."
```
- **Most powerful header:** Prevents XSS, injection
- **Directive-by-directive:**

| Directive | Value | What It Allows | Why |
|-----------|-------|----------------|-----|
| `default-src` | `'self'` | Only same origin | Strictest default |
| `script-src` | `'self'` | Only our JS files | No inline `<script>` |
| `style-src` | `'self' 'unsafe-inline'` | Our CSS + inline styles | Tailwind needs inline |
| `img-src` | `'self' data: https:` | Our images + data URLs + HTTPS | Allow base64 images |
| `connect-src` | `'self'` | Only our API | No external API calls |
| `frame-ancestors` | `'none'` | Can't be iframed | Same as X-Frame-Options |

**Why 'unsafe-inline' for styles:**
- **Problem:** Tailwind uses inline styles
- **Options:**
  1. Allow inline: `'unsafe-inline'` ← We chose this
  2. Use nonces: `'nonce-xyz123'` ← Complex to implement
  3. No Tailwind: Use external CSS ← Would require rewrite
- **Trade-off:** Slight security reduction for developer experience

**5. Strict-Transport-Security (HSTS):**
```python
'Strict-Transport-Security': 'max-age=31536000'
```
- **What it does:** Forces HTTPS for 1 year
- **COMMENTED OUT:** Only enable with HTTPS certificate!
- **Why critical:** Prevents SSL stripping attacks
- **When to enable:** After deploying with HTTPS
- **Parameters:**
  - `max-age=31536000` - 1 year in seconds
  - `includeSubDomains` - Apply to all subdomains
  - `preload` - Add to browser HSTS preload list

---

### 5. CORS Hardening

**What it does:** Controls which websites can call your API

**Why we need it:**
- Currently: ANY website can call your API
- Attack: Evil.com calls your API, steals user data
- Prevention: Only allow YOUR frontend

**Current Configuration (WEAK):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],  # ← DANGEROUS
    allow_headers=["*"],  # ← DANGEROUS
)
```

**Problems:**
1. `allow_methods=["*"]` - Allows OPTIONS, TRACE, etc.
2. `allow_headers=["*"]` - Allows any header
3. No validation on origins

**Improved Configuration:**

```python
# backend/api.py
from fastapi.middleware.cors import CORSMiddleware
import os

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")

# Production origins (when deployed)
# ALLOWED_ORIGINS = [
#     "https://docusearch-pro.vercel.app",
#     "https://www.yourdomain.com"
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Whitelist only
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["GET", "POST"],  # Only what we use
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Accept-Language",
        "Content-Language"
    ],  # Specific headers only
    max_age=600,  # Cache preflight for 10 minutes
)
```

**Why each setting:**

**allow_origins (Whitelist):**
```python
allow_origins=ALLOWED_ORIGINS
```
- **Alternative 1:** `["*"]` - Allow all (NEVER!)
- **Alternative 2:** Regex pattern - Complex, error-prone
- **Chosen:** Explicit whitelist from env variable
- **Why:** Simple, secure, configurable per environment

**allow_methods (Minimal):**
```python
allow_methods=["GET", "POST"]
```
- **Current:** `["*"]` allows PUT, DELETE, OPTIONS, TRACE
- **Problem:** Don't use those methods, why allow them?
- **Security:** Smaller attack surface
- **Chosen:** Only GET (status) and POST (init, upload, query)

**allow_headers (Specific):**
```python
allow_headers=["Content-Type", "Authorization", ...]
```
- **Current:** `["*"]` allows any header
- **Problem:** Custom headers can bypass security
- **Chosen:** Only headers we actually use
- **Why:** Principle of least privilege

**max_age (Cache Preflight):**
```python
max_age=600
```
- **What:** How long browser caches CORS preflight
- **600 seconds:** 10 minutes
- **Why:** Reduces OPTIONS requests (performance)
- **Alternative:** 3600 (1 hour), 86400 (1 day)
- **Chosen:** 10 min balances perf and flexibility

---

## Comparison: Before vs After Security

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| **Rate Limiting** | ❌ None | ✅ Per-endpoint limits | Prevents DOS |
| **File Validation** | ❌ None | ✅ Size, type, content checks | Prevents malicious uploads |
| **Input Validation** | ❌ Basic types only | ✅ Pydantic models + validators | Prevents injection |
| **Security Headers** | ❌ None | ✅ 8 protective headers | Prevents XSS, clickjacking |
| **CORS** | ⚠️ Weak (allow_methods=*) | ✅ Strict whitelist | Prevents CSRF |
| **Error Handling** | ⚠️ Leaks stack traces | ✅ Generic user messages | Prevents info disclosure |
| **Request Limits** | ❌ Unlimited | ✅ 50MB max | Prevents memory exhaustion |

---

## Implementation Order

### Week 1: Critical Security
1. ✅ File upload validation (2 hours)
2. ✅ Rate limiting (3 hours)
3. ✅ Input validation (2 hours)

### Week 2: Protection Layers
4. ✅ Security headers (1 hour)
5. ✅ CORS hardening (1 hour)
6. ✅ Request size limits (1 hour)

### Week 3: Polish
7. ✅ Error handling (2 hours)
8. ✅ Environment validation (1 hour)
9. ✅ Security testing (4 hours)

**Total Effort:** ~17 hours over 3 weeks

---

## Testing Security

### Manual Tests

**1. Test Rate Limiting:**
```bash
# Should succeed 5 times, then fail
for i in {1..10}; do
  curl -X POST http://localhost:8787/init \
    -H "Content-Type: application/json" \
    -d '{"api_key":"test"}'
  sleep 1
done
```

**2. Test File Size Limit:**
```bash
# Create 11MB file (should fail)
dd if=/dev/zero of=large.pdf bs=1M count=11
curl -X POST http://localhost:8787/upload \
  -F "files=@large.pdf"
# Expected: 413 Payload Too Large
```

**3. Test Input Validation:**
```bash
# Invalid num_sources (should fail)
curl -X POST http://localhost:8787/query \
  -H "Content-Type: application/json" \
  -d '{"question":"test","num_sources":999}'
# Expected: 422 Validation Error
```

**4. Test CORS:**
```javascript
// In browser console on evil.com
fetch('http://localhost:8787/status')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
// Expected: CORS error
```

### Automated Security Tests

```python
# tests/test_security.py
import pytest
from fastapi.testclient import TestClient
from api import app

client = TestClient(app)

def test_rate_limiting():
    """Test rate limiting prevents abuse"""
    # Make 6 requests (limit is 5)
    for i in range(6):
        response = client.post("/init", json={"api_key": "test"})
        if i < 5:
            assert response.status_code in [401, 500]  # Invalid key, but not rate limited
        else:
            assert response.status_code == 429  # Too Many Requests

def test_file_size_limit():
    """Test large files are rejected"""
    # Create 11MB fake file
    large_file = ("test.pdf", b"x" * (11 * 1024 * 1024), "application/pdf")
    response = client.post("/upload", files={"files": large_file})
    assert response.status_code == 413

def test_path_traversal():
    """Test path traversal is blocked"""
    response = client.post("/remove-file", json={"filename": "../../etc/passwd"})
    assert response.status_code == 422  # Validation error

def test_xss_in_question():
    """Test XSS attempts are blocked"""
    response = client.post("/query", json={
        "question": "<script>alert('xss')</script>",
        "num_sources": 4
    })
    assert response.status_code == 422

def test_security_headers():
    """Test security headers are present"""
    response = client.get("/")
    assert "X-Frame-Options" in response.headers
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "X-Content-Type-Options" in response.headers
    assert "Content-Security-Policy" in response.headers
```

---

## Next Steps: Implementation

I'll now implement these security improvements in order:

1. ✅ Document created (this file)
2. ⏳ Install dependencies
3. ⏳ Add rate limiting
4. ⏳ Add file validation
5. ⏳ Add input validation
6. ⏳ Add security headers
7. ⏳ Harden CORS
8. ⏳ Add request limits
9. ⏳ Improve error handling
10. ⏳ Add environment validation

**Ready to proceed with implementation?**

Each change will be explained as we make it.

---

## Security Maintenance Checklist

### Monthly
- [ ] Update all dependencies (`pip install --upgrade`)
- [ ] Review rate limit logs for abuse patterns
- [ ] Check error logs for attack attempts
- [ ] Rotate API keys if compromised

### Quarterly
- [ ] Security audit with OWASP ZAP or Burp Suite
- [ ] Review and update CORS whitelist
- [ ] Test backup and recovery procedures
- [ ] Update security documentation

### Yearly
- [ ] Penetration testing (hire professional)
- [ ] Review all security policies
- [ ] Update incident response plan
- [ ] Security training for team

---

**Version:** 1.0
**Last Updated:** January 5, 2026
**Next Review:** February 5, 2026
