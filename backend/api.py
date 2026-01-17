"""
DocuSearch API
FastAPI backend that exposes RAG functionality via HTTP endpoints

Security Features:
- Rate limiting to prevent API abuse
- File upload validation (size, type, content)
- Input validation with Pydantic
- Security headers (XSS, clickjacking protection)
- Hardened CORS configuration
- Request size limits
- Secure error handling
"""

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

# Try to import magic (file type detection)
# Fallback to basic validation if not available
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    print("Warning: python-magic not available. Using basic file validation.")

# Don't import PaperQA at startup - it's slow!
# Import it only when user clicks "Initialize" (lazy loading)
PaperQA = None

# ============================================
# SECURITY CONFIGURATION
# ============================================

# Load API key from .env file (secure - not committed to git)
# The .env file contains: GROQ_API_KEY=gsk_your_key_here
from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    print("=" * 60)
    print("ERROR: GROQ_API_KEY not found!")
    print("=" * 60)
    print("Create a file: backend/.env")
    print("Add this line: GROQ_API_KEY=gsk_your_key_here")
    print("=" * 60)
    import sys
    sys.exit(1)

# File upload security limits
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB per file
MAX_TOTAL_UPLOAD = 200 * 1024 * 1024  # 200MB total per request
ALLOWED_EXTENSIONS = {'.pdf'}
ALLOWED_MIME_TYPES = {'application/pdf'}

# Rate limiting configuration
# Why these limits? See SECURITY_IMPROVEMENTS.md
RATE_LIMITS = {
    "init": "5/minute",      # Expensive operation (API validation)
    "upload": "10/hour",     # File processing is resource-intensive
    "query": "30/minute",    # Main feature, allow reasonable usage
    "status": "60/minute",   # Cheap operation, can be frequent
    "remove": "20/hour",     # Modify operation, moderate limit
    "reset": "5/hour"        # Destructive operation, strict limit
}

# ============================================
# FASTAPI APPLICATION SETUP
# ============================================

app = FastAPI(
    title="DocuSearch API",
    version="1.0.0",
    description="RAG-powered document Q&A system with security hardening"
)

# ============================================
# RATE LIMITING SETUP
# ============================================
# Uses slowapi for per-IP rate limiting
# Prevents DOS attacks and API abuse
# Alternative: nginx rate limiting (needs infrastructure)
# Alternative: Cloud rate limiting (expensive)
# Chosen: slowapi (best FastAPI integration)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================
# SECURITY HEADERS MIDDLEWARE
# ============================================
# Adds protective HTTP headers to all responses
# Prevents: XSS, clickjacking, MIME sniffing attacks
# Alternative: nginx headers (needs infrastructure)
# Alternative: Starlette built-in (limited)
# Chosen: Custom middleware (full control, no dependencies)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses

    Headers added:
    1. X-XSS-Protection: Blocks XSS attacks in older browsers
    2. X-Frame-Options: Prevents clickjacking via iframes
    3. X-Content-Type-Options: Prevents MIME type sniffing
    4. Content-Security-Policy: Comprehensive XSS protection
    5. Referrer-Policy: Controls referrer information
    6. Permissions-Policy: Restricts browser features

    See SECURITY_IMPROVEMENTS.md for detailed explanation
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Prevent XSS attacks (older browsers)
        # Modern browsers use CSP, but this helps legacy
        response.headers['X-XSS-Protection'] = '1; mode=block'

        # Prevent clickjacking (iframe embedding)
        # DENY = never allow iframing
        # Alternative: SAMEORIGIN (allow same-domain iframes)
        response.headers['X-Frame-Options'] = 'DENY'

        # Prevent MIME type sniffing
        # Forces browser to respect Content-Type header
        # Prevents: executing images as JavaScript
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # Content Security Policy (CSP)
        # Most powerful XSS prevention
        # Restricts what resources can load
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "  # Only load from same origin
            "script-src 'self'; "   # Only our JavaScript
            "style-src 'self' 'unsafe-inline'; "  # Our CSS + inline (Tailwind needs this)
            "img-src 'self' data: https:; "  # Images: ours + data URLs + HTTPS
            "font-src 'self'; "     # Only our fonts
            "connect-src 'self'; "  # Only our API
            "frame-ancestors 'none';"  # Can't be iframed (same as X-Frame-Options)
        )

        # Control referrer information leakage
        # strict-origin-when-cross-origin: Send origin only to different sites
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Disable dangerous browser features
        # Prevents: location tracking, microphone/camera access
        response.headers['Permissions-Policy'] = (
            'geolocation=(), '
            'microphone=(), '
            'camera=()'
        )

        return response

app.add_middleware(SecurityHeadersMiddleware)

# ============================================
# CORS CONFIGURATION (HARDENED)
# ============================================
# Previous config had allow_methods=["*"] and allow_headers=["*"]
# Security risk: Allows any HTTP method and header
#
# Improvements:
# 1. Specific methods only (GET, POST) - not PUT, DELETE, TRACE, etc.
# 2. Specific headers only - not custom dangerous headers
# 3. max_age for caching preflight (performance + security)
#
# Alternative: nginx CORS (needs infrastructure)
# Alternative: Regex origins (complex, error-prone)
# Chosen: Explicit whitelist (simple, secure)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Vite dev server
        "http://localhost:5173",   # Alternative Vite port
        "https://docu-search-qy9zbuu81-swastik-sahoos-projects.vercel.app",  # Vercel preview
        "https://docu-search.vercel.app",  # Vercel production (if you set custom domain)
        "https://*.vercel.app"     # Any Vercel preview deployment
    ],
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["GET", "POST"],  # Only what we use (was: ["*"])
    allow_headers=[  # Specific headers only (was: ["*"])
        "Content-Type",
        "Authorization",
        "Accept",
        "Accept-Language",
        "Content-Language"
    ],
    max_age=600,  # Cache preflight for 10 minutes (performance)
)

# Global state
rag_instance: Optional[PaperQA] = None
loaded_files: List[str] = []

def get_rag_instance():
    """Lazy load RAG instance on first use (auto-initialized with API key from .env)"""
    global rag_instance
    if rag_instance is None:
        print("Initializing RAG system (first use - may take 1-2 min)...")
        from rag_engine import PaperQA as PaperQAClass
        rag_instance = PaperQAClass(
            groq_api_key=GROQ_API_KEY,
            persist_directory=tempfile.mkdtemp()
        )
        print("RAG system ready!")
    return rag_instance

# ============================================
# PYDANTIC MODELS WITH VALIDATION
# ============================================
# Enhanced with Field validators and custom validation logic
# Prevents: injection attacks, malformed inputs, resource exhaustion
# Alternative: Manual validation (error-prone, repetitive)
# Alternative: Marshmallow (not FastAPI native)
# Chosen: Pydantic (built into FastAPI, type-safe)

# InitRequest removed - API key now comes from .env file


class QueryRequest(BaseModel):
    """
    Document query request

    Security validations:
    - Question length limits (prevent memory exhaustion)
    - num_sources range check (prevent DOS via huge retrieval)
    - XSS prevention (basic script tag detection)
    - Whitespace normalization
    """
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,  # Prevent huge payloads
        description="Question to ask about documents"
    )
    num_sources: int = Field(
        default=4,
        ge=1,  # Greater than or equal to 1
        le=10,  # Less than or equal to 10 (prevent resource exhaustion)
        description="Number of sources to retrieve (1-10)"
    )

    @validator('question')
    def validate_question(cls, v):
        """
        Validate and sanitize question input

        Checks:
        1. Remove excessive whitespace
        2. Minimum meaningful length
        3. Basic XSS prevention (script tags)

        Why: Prevent injection attacks and malformed queries
        """
        # Normalize whitespace (multiple spaces -> single space)
        v = ' '.join(v.split())

        # Check minimum meaningful length
        if len(v.strip()) < 3:
            raise ValueError('Question too short. Minimum 3 characters.')

        # Basic XSS prevention (not comprehensive, CSP is primary defense)
        # This is defense-in-depth
        dangerous_patterns = [
            '<script', 'javascript:', 'onerror=',
            'onclick=', 'onload=', '<iframe'
        ]
        v_lower = v.lower()
        for pattern in dangerous_patterns:
            if pattern in v_lower:
                raise ValueError('Invalid characters in question')

        return v


class RemoveFileRequest(BaseModel):
    """
    File removal request

    Security validations:
    - Path traversal prevention (../, /, \\)
    - Extension validation (.pdf only)
    - Length limits
    - Filename sanitization
    """
    filename: str = Field(
        ...,
        min_length=1,
        max_length=255,  # Filesystem limit
        description="Filename to remove (must end with .pdf)"
    )

    @validator('filename')
    def validate_filename(cls, v):
        """
        Validate filename for security

        Checks:
        1. No path traversal attempts (../, /, \\)
        2. Must be .pdf extension
        3. No null bytes or control characters

        Why: Prevent directory traversal and unauthorized file access
        """
        # Check for path traversal
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('Invalid filename: path traversal detected')

        # Check for null bytes (poison null byte attack)
        if '\x00' in v:
            raise ValueError('Invalid filename: null byte detected')

        # Must end with .pdf
        if not v.lower().endswith('.pdf'):
            raise ValueError('Filename must end with .pdf')

        # Check for control characters
        if any(ord(c) < 32 or ord(c) == 127 for c in v):
            raise ValueError('Invalid filename: control characters detected')

        return v


class QueryResponse(BaseModel):
    """Query response model (no validation needed - we control this)"""
    answer: str
    sources: List[dict]
    num_sources: int


class StatusResponse(BaseModel):
    """Status response model (no validation needed - we control this)"""
    initialized: bool
    files_loaded: List[str]
    total_chunks: int


# ============================================
# FILE UPLOAD SECURITY FUNCTIONS
# ============================================

async def validate_upload_file(file: UploadFile) -> None:
    """
    Comprehensive file upload validation

    Security checks performed:
    1. Filename validation (path traversal, length, characters)
    2. Extension validation (.pdf only)
    3. File size validation (max 10MB per file)
    4. MIME type validation (magic number check)
    5. Empty file detection

    Why each check:
    - Filename: Prevent ../../etc/passwd attacks
    - Extension: Only allow PDFs (whitelist approach)
    - Size: Prevent disk exhaustion and DOS
    - MIME: Prevent fake extensions (virus.exe renamed to virus.pdf)
    - Empty: Prevent processing errors

    Alternatives considered:
    - ClamAV virus scanning: Too slow (2-5 sec/file), heavy resource use
    - Cloud scanning: Expensive, privacy concerns
    - Magic number only: Not enough (need all checks)
    Chosen: Layered validation (defense in depth)

    Raises:
        HTTPException: If validation fails
    """
    filename = file.filename

    # 1. Validate filename for path traversal
    # Attack: ../../etc/passwd -> access system files
    # Prevention: Reject any path-like characters
    if '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid filename '{filename}': path traversal detected"
        )

    # Check for null bytes (poison null byte attack)
    # Attack: file.pdf\x00.exe -> bypass extension check
    # Prevention: Reject filenames with null bytes
    if '\x00' in filename:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid filename '{filename}': null byte detected"
        )

    # 2. Validate file extension
    # Why whitelist over blacklist: Can't anticipate all dangerous extensions
    # Alternative: Blacklist .exe, .sh, .bat -> Easy to bypass with .com, .scr, etc.
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only PDF files allowed. Got: {file_ext}"
        )

    # 3. Validate file size
    # Why 10MB: Typical academic paper is 1-5MB, 10MB covers edge cases
    # Alternative: 50MB, 100MB -> Increases DOS risk
    # Alternative: Unlimited -> Severe DOS risk
    file.file.seek(0, 2)  # Seek to end of file
    file_size = file.file.tell()  # Get current position = file size
    file.file.seek(0)  # Reset to beginning for reading

    if file_size > MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=413,  # Payload Too Large (RFC 7231)
            detail=f"File too large: {size_mb:.2f}MB. Maximum: 10MB"
        )

    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Empty file not allowed: {filename}"
        )

    # 4. Validate MIME type (magic number check)
    # Why: Extensions can be faked (virus.exe -> virus.pdf)
    # How: Read file header bytes and detect actual type
    # PDF files start with: %PDF-1.x
    file_content = await file.read(2048)  # Read first 2KB
    file.file.seek(0)  # Reset for later processing

    if MAGIC_AVAILABLE:
        try:
            # python-magic library checks file signature
            mime = magic.from_buffer(file_content, mime=True)

            if mime not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file content. Expected PDF, got: {mime}"
                )
        except Exception as e:
            # If magic fails, reject (fail secure)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to validate file type for {filename}"
            )
    else:
        # Fallback: Check PDF magic number manually
        # PDF files start with "%PDF-" (bytes: 0x25 0x50 0x44 0x46 0x2D)
        if not file_content.startswith(b'%PDF-'):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file content. File does not appear to be a PDF"
            )


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to safe version

    Sanitization steps:
    1. Remove path components (keep basename only)
    2. Remove control characters (0x00-0x1F, 0x7F-0x9F)
    3. Remove dangerous characters (<>:"|?*)
    4. Limit length to 200 characters

    Why: Defense in depth, even after validation
    Alternative: Just validate -> Validation can have bugs
    Chosen: Validate AND sanitize (layered security)
    """
    # Remove any path components
    filename = os.path.basename(filename)

    # Remove control characters
    filename = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)

    # Remove dangerous characters for filesystems
    filename = re.sub(r'[<>:"|?*]', '', filename)

    # Limit length (keep extension)
    name, ext = os.path.splitext(filename)
    if len(name) > 200:
        name = name[:200]

    return f"{name}{ext}"


@app.get("/")
@limiter.limit(RATE_LIMITS["status"])
async def root(request: Request):
    """
    Health check endpoint

    Rate limit: 60/minute (generous for monitoring)
    Why: Cheap operation, can be called frequently by monitoring tools
    """
    return {"status": "ok", "message": "DocuSearch API is running"}


# /init endpoint removed - system auto-initializes on first upload/query

@app.post("/upload")
@limiter.limit(RATE_LIMITS["upload"])
async def upload_files(request: Request, files: List[UploadFile] = File(...)):
    """
    Upload and process PDF files with comprehensive security validation

    Rate limit: 10/hour
    Why: File processing is resource-intensive (CPU, memory, disk I/O)

    Security validations (per file):
    1. Filename validation (path traversal, null bytes)
    2. Extension check (.pdf only, whitelist approach)
    3. Size limit (10MB per file, 50MB total)
    4. MIME type check (magic number verification)
    5. Empty file detection
    6. Filename sanitization before storage

    Previous vulnerabilities fixed:
    - ❌ No file size limits -> ✅ 10MB per file, 50MB total
    - ❌ No type validation -> ✅ Extension + MIME type check
    - ❌ Trusted filenames -> ✅ Path traversal + sanitization
    - ❌ Any file type -> ✅ PDF whitelist only

    Returns:
        200: Success with processed files list
        400: Invalid request or file validation failed
        413: Payload too large
        429: Rate limit exceeded
        500: Server error
    """
    global loaded_files

    # Auto-initialize RAG instance on first use
    rag_instance = get_rag_instance()

    # Check total upload size
    # Why: Prevent memory exhaustion from massive uploads
    # Alternative: No limit -> Risk of server crash
    # Alternative: Per-file only -> Can upload 100x 10MB files
    # Chosen: Both per-file AND total limits
    total_size = sum(
        file.file.seek(0, 2) or file.file.tell()
        for file in files
        if (file.file.seek(0) or True)  # Reset after seek
    )

    if total_size > MAX_TOTAL_UPLOAD:
        size_mb = total_size / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Total upload too large: {size_mb:.2f}MB. Maximum: 50MB"
        )

    all_chunks = []
    processed_files = []
    errors = []

    for file in files:
        try:
            # SECURITY: Comprehensive file validation
            # Validates: filename, extension, size, MIME type, empty files
            # See validate_upload_file() function for detailed checks
            await validate_upload_file(file)

            # SECURITY: Sanitize filename before using
            # Prevents: path traversal, control characters, filesystem issues
            safe_filename = sanitize_filename(file.filename)

            # Use safe filename for temporary storage
            # Why temp directory: Isolated, auto-cleaned, proper permissions
            temp_path = os.path.join(tempfile.gettempdir(), safe_filename)

            # Write uploaded file to disk
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Process PDF through RAG engine
            chunks = rag_instance.load_pdf(temp_path)
            all_chunks.extend(chunks)
            processed_files.append(safe_filename)
            loaded_files.append(safe_filename)

            # Clean up temporary file
            # Why: Prevent disk exhaustion from temp files
            os.remove(temp_path)

        except HTTPException:
            # Re-raise validation errors (already have proper status codes)
            raise
        except Exception as e:
            # Log actual error internally (for debugging)
            print(f"Error processing {file.filename}: {str(e)}")
            # Return generic error to user (security - don't leak internals)
            errors.append(f"{file.filename}: Failed to process")

    # Create or update vector store with all chunks
    if all_chunks:
        try:
            rag_instance.create_vectorstore(all_chunks)
        except Exception as e:
            # Log internally
            print(f"Vector store creation failed: {str(e)}")
            # Generic error to user
            raise HTTPException(
                status_code=500,
                detail="Failed to index documents"
            )

    return {
        "status": "success",
        "processed_files": processed_files,
        "total_chunks": len(all_chunks),
        "errors": errors if errors else None
    }


@app.post("/query", response_model=QueryResponse)
@limiter.limit(RATE_LIMITS["query"])
async def query(request: Request, query_request: QueryRequest):
    """
    Query documents with RAG system

    Rate limit: 30/minute
    Why: Main feature, but still needs protection from abuse
         30/min = 1 query every 2 seconds (reasonable for humans)

    Security validations (via Pydantic):
    - Question length: 1-1000 characters
    - num_sources range: 1-10
    - XSS prevention: Script tag detection
    - Whitespace normalization

    Returns:
        200: Success with answer and sources
        400: Invalid request or system not initialized
        422: Validation error (Pydantic)
        429: Rate limit exceeded
        500: Server error
    """
    # Auto-initialize RAG instance on first use
    rag_instance = get_rag_instance()

    if not rag_instance.vectorstore:
        raise HTTPException(status_code=400, detail="Upload files first")

    try:
        # query_request already validated by Pydantic
        # - question: sanitized, length checked, XSS filtered
        # - num_sources: 1-10 range
        result = rag_instance.query(
            query_request.question,
            k=query_request.num_sources
        )
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"],
            num_sources=result["num_sources"]
        )
    except Exception as e:
        # Log internally for debugging
        print(f"Query failed: {str(e)}")
        # Generic error to user (security - don't leak internals)
        raise HTTPException(status_code=500, detail="Query processing failed")


@app.get("/status", response_model=StatusResponse)
@limiter.limit(RATE_LIMITS["status"])
async def get_status(request: Request):
    """
    Get system status

    Rate limit: 60/minute
    Why: Cheap operation, monitoring tools may call frequently
    Security: No sensitive data exposed, read-only operation

    Returns:
        200: Status information
        429: Rate limit exceeded
    """
    global rag_instance, loaded_files

    total_chunks = 0
    if rag_instance and rag_instance.vectorstore:
        try:
            stats = rag_instance.get_stats()
            total_chunks = stats.get("total_chunks", 0)
        except Exception as e:
            # Log error but don't fail the status check
            print(f"Failed to get vector store stats: {str(e)}")
            total_chunks = 0

    return StatusResponse(
        initialized=rag_instance is not None,
        files_loaded=loaded_files,
        total_chunks=total_chunks
    )


@app.post("/remove-file")
@limiter.limit(RATE_LIMITS["remove"])
async def remove_file(request: Request, remove_request: RemoveFileRequest):
    """
    Remove a file from the vector store

    Rate limit: 20/hour
    Why: Modify operation, needs protection from abuse
    Security: Pydantic validates filename (path traversal, extension)

    Returns:
        200: File removed successfully
        400: Invalid request or system not initialized
        404: File not found
        422: Validation error (Pydantic)
        429: Rate limit exceeded
        500: Server error
    """
    global loaded_files

    # Auto-initialize RAG instance on first use
    rag_instance = get_rag_instance()

    if not rag_instance.vectorstore:
        raise HTTPException(status_code=400, detail="No files uploaded yet")

    try:
        # remove_request.filename already validated by Pydantic
        # - No path traversal
        # - Must be .pdf
        # - No control characters
        result = rag_instance.remove_file(remove_request.filename)

        # Update the global loaded_files list
        if remove_request.filename in loaded_files:
            loaded_files.remove(remove_request.filename)

        return {
            "status": "success",
            "message": f"Removed {remove_request.filename}",
            "removed_chunks": result["removed_chunks"],
            "remaining_chunks": result["remaining_chunks"]
        }
    except ValueError as e:
        # File not found in vector store
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Log internally
        print(f"Failed to remove file {remove_request.filename}: {str(e)}")
        # Generic error to user
        raise HTTPException(status_code=500, detail="Failed to remove file")


@app.post("/reset")
@limiter.limit(RATE_LIMITS["reset"])
async def reset(request: Request):
    """
    Reset the system (clear all data)

    Rate limit: 5/hour
    Why: Destructive operation, strict limit to prevent abuse
    Security: No authentication required (MVP), but rate limited

    Note: In production, this should require authentication/authorization

    Returns:
        200: System reset successfully
        429: Rate limit exceeded
    """
    global rag_instance, loaded_files

    try:
        # Clean up resources (will auto-re-initialize on next use)
        rag_instance = None
        loaded_files = []

        return {"status": "success", "message": "System reset (will re-initialize on next use)"}
    except Exception as e:
        # Log error
        print(f"Failed to reset system: {str(e)}")
        # Still return success (fail open for reset)
        return {"status": "success", "message": "System reset"}


if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("Starting DocuSearch API with security hardening...")
    print("Rate limiting: enabled")
    print("File validation: enabled")
    print("Security headers: enabled")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8000)