"""
DocuSearch API
FastAPI backend that exposes RAG functionality via HTTP endpoints
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import tempfile
import os
import shutil

from rag_engine import PaperQA

app = FastAPI(title="DocuSearch API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_instance: Optional[PaperQA] = None
loaded_files: List[str] = []


class InitRequest(BaseModel):
    api_key: str


class QueryRequest(BaseModel):
    question: str
    num_sources: int = 4


class RemoveFileRequest(BaseModel):
    filename: str


class QueryResponse(BaseModel):
    answer: str
    sources: List[dict]
    num_sources: int


class StatusResponse(BaseModel):
    initialized: bool
    files_loaded: List[str]
    total_chunks: int


@app.get("/")
async def root():
    return {"status": "ok", "message": "DocuSearch API is running"}


@app.post("/init")
async def initialize(request: InitRequest):
    global rag_instance, loaded_files

    try:
        # Create RAG instance
        rag_instance = PaperQA(
            groq_api_key=request.api_key,
            persist_directory=tempfile.mkdtemp()
        )

        # VALIDATE API KEY by making a test call
        try:
            test_result = rag_instance.llm.invoke("test")
            print(f"API key validated successfully: {test_result.content[:50]}")
        except Exception as key_error:
            rag_instance = None
            error_msg = str(key_error)

            # Check for specific API key errors
            if "401" in error_msg or "invalid_api_key" in error_msg or "Invalid API Key" in error_msg:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid Groq API key. Please check your API key at https://console.groq.com/keys"
                )
            elif "403" in error_msg or "forbidden" in error_msg:
                raise HTTPException(
                    status_code=403,
                    detail="API key access denied. Your key may be expired or disabled."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to validate API key: {error_msg}"
                )

        loaded_files = []
        return {"status": "success", "message": "RAG system initialized with valid API key"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize: {str(e)}")


@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    global rag_instance, loaded_files
    
    if not rag_instance:
        raise HTTPException(status_code=400, detail="Call /init first")
    
    all_chunks = []
    processed_files = []
    errors = []
    
    for file in files:
        if not file.filename.endswith('.pdf'):
            errors.append(f"{file.filename}: Not a PDF")
            continue
        
        try:
            temp_path = os.path.join(tempfile.gettempdir(), file.filename)
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            chunks = rag_instance.load_pdf(temp_path)
            all_chunks.extend(chunks)
            processed_files.append(file.filename)
            loaded_files.append(file.filename)
            os.remove(temp_path)
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
    
    if all_chunks:
        rag_instance.create_vectorstore(all_chunks)
    
    return {
        "status": "success",
        "processed_files": processed_files,
        "total_chunks": len(all_chunks),
        "errors": errors if errors else None
    }


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    global rag_instance
    
    if not rag_instance:
        raise HTTPException(status_code=400, detail="Call /init first")
    
    if not rag_instance.vectorstore:
        raise HTTPException(status_code=400, detail="Upload files first")
    
    try:
        result = rag_instance.query(request.question, k=request.num_sources)
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"],
            num_sources=result["num_sources"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.get("/status", response_model=StatusResponse)
async def get_status():
    global rag_instance, loaded_files
    
    total_chunks = 0
    if rag_instance and rag_instance.vectorstore:
        stats = rag_instance.get_stats()
        total_chunks = stats.get("total_chunks", 0)
    
    return StatusResponse(
        initialized=rag_instance is not None,
        files_loaded=loaded_files,
        total_chunks=total_chunks
    )


@app.post("/remove-file")
async def remove_file(request: RemoveFileRequest):
    global rag_instance, loaded_files

    if not rag_instance:
        raise HTTPException(status_code=400, detail="Call /init first")

    if not rag_instance.vectorstore:
        raise HTTPException(status_code=400, detail="No files uploaded yet")

    try:
        result = rag_instance.remove_file(request.filename)

        # Update the global loaded_files list
        if request.filename in loaded_files:
            loaded_files.remove(request.filename)

        return {
            "status": "success",
            "message": f"Removed {request.filename}",
            "removed_chunks": result["removed_chunks"],
            "remaining_chunks": result["remaining_chunks"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove file: {str(e)}")


@app.post("/reset")
async def reset():
    global rag_instance, loaded_files
    rag_instance = None
    loaded_files = []
    return {"status": "success", "message": "System reset"}