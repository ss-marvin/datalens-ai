from pydantic import BaseModel, Field
from typing import Any
from enum import Enum


class FileType(str, Enum):
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"
    PARQUET = "parquet"
    TSV = "tsv"


class ColumnProfile(BaseModel):
    """Statistical profile for a single column."""
    name: str
    dtype: str
    non_null_count: int
    null_count: int
    null_percentage: float
    unique_count: int
    
    # Numeric stats (optional)
    mean: float | None = None
    std: float | None = None
    min: float | None = None
    max: float | None = None
    median: float | None = None
    q25: float | None = None
    q75: float | None = None
    
    # Categorical stats (optional)
    top_values: list[dict[str, Any]] | None = None
    

class DataProfile(BaseModel):
    """Complete profile of a dataset."""
    session_id: str
    filename: str
    file_type: FileType
    row_count: int
    column_count: int
    memory_usage_mb: float
    columns: list[ColumnProfile]
    sample_data: list[dict[str, Any]]
    quality_score: float = Field(ge=0, le=100)
    warnings: list[str] = []


class QueryRequest(BaseModel):
    """Request model for natural language queries."""
    session_id: str
    query: str
    include_code: bool = False


class ChartType(str, Enum):
    LINE = "line"
    BAR = "bar"
    AREA = "area"
    SCATTER = "scatter"
    PIE = "pie"
    HISTOGRAM = "histogram"
    HEATMAP = "heatmap"


class ChartData(BaseModel):
    """Data structure for chart rendering."""
    type: ChartType
    title: str
    data: list[dict[str, Any]]
    x_key: str | None = None
    y_keys: list[str] = []
    config: dict[str, Any] = {}


class QueryResponse(BaseModel):
    """Response model for query results."""
    success: bool
    answer: str
    data: list[dict[str, Any]] | None = None
    chart: ChartData | None = None
    code: str | None = None
    execution_time_ms: float


class UploadResponse(BaseModel):
    """Response model for file upload."""
    success: bool
    session_id: str
    message: str
    profile: DataProfile | None = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    error: str
    detail: str | None = None
