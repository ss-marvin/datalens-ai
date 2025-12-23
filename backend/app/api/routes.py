import uuid
import aiofiles
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from ..config import get_settings
from ..models import (
    UploadResponse,
    QueryRequest,
    QueryResponse,
    DataProfile,
    ErrorResponse,
)
from ..services import DataService, get_ai_service


router = APIRouter(prefix="/api", tags=["data"])
settings = get_settings()

# Ensure upload directory exists
UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(exist_ok=True)


def cleanup_file(file_path: Path):
    """Background task to clean up uploaded files."""
    try:
        if file_path.exists():
            file_path.unlink()
    except Exception:
        pass


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Upload a data file for analysis.
    
    Supports: CSV, Excel (.xlsx, .xls), JSON, Parquet, TSV
    """
    # Validate file extension
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()
    
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(settings.allowed_extensions)}"
        )
    
    # Check file size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {size_mb:.1f}MB. Maximum: {settings.max_file_size_mb}MB"
        )
    
    # Generate session ID and save file
    session_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{session_id}{ext}"
    
    try:
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)
        
        # Detect file type and load data
        file_type = DataService.detect_file_type(filename)
        df = await DataService.load_file(file_path, file_type)
        
        # Store in session
        DataService.store_session(session_id, df, {
            "filename": filename,
            "file_type": file_type,
        })
        
        # Generate profile
        profile = DataService.profile_dataframe(df, session_id, filename, file_type)
        
        # Schedule file cleanup
        background_tasks.add_task(cleanup_file, file_path)
        
        return UploadResponse(
            success=True,
            session_id=session_id,
            message=f"Successfully loaded {filename}",
            profile=profile,
        )
        
    except Exception as e:
        # Clean up on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@router.get("/profile/{session_id}", response_model=DataProfile)
async def get_profile(session_id: str):
    """Get data profile for a session."""
    df = DataService.get_session(session_id)
    metadata = DataService.get_metadata(session_id)
    
    if df is None or metadata is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    
    return DataService.profile_dataframe(
        df,
        session_id,
        metadata["filename"],
        metadata["file_type"],
    )


@router.post("/query", response_model=QueryResponse)
async def query_data(request: QueryRequest):
    """
    Query data using natural language.
    
    Returns analysis results, optional visualization data, and generated code.
    """
    df = DataService.get_session(request.session_id)
    
    if df is None:
        raise HTTPException(
            status_code=404,
            detail=f"Session not found: {request.session_id}. Please upload a file first."
        )
    
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    ai_service = get_ai_service()
    response = await ai_service.query(
        session_id=request.session_id,
        user_query=request.query,
        include_code=request.include_code,
    )
    
    return response


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its data."""
    if DataService.delete_session(session_id):
        return {"success": True, "message": f"Session {session_id} deleted"}
    raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "active_sessions": len(DataService._sessions),
    }
