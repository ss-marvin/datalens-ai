import pandas as pd
import numpy as np
from pathlib import Path
from typing import Any
import json

from ..models import FileType, ColumnProfile, DataProfile


class DataService:
    """Service for data loading, profiling, and manipulation."""
    
    # In-memory storage for active sessions
    _sessions: dict[str, pd.DataFrame] = {}
    _metadata: dict[str, dict[str, Any]] = {}
    
    @classmethod
    def detect_file_type(cls, filename: str) -> FileType:
        """Detect file type from extension."""
        ext = Path(filename).suffix.lower()
        mapping = {
            ".csv": FileType.CSV,
            ".xlsx": FileType.EXCEL,
            ".xls": FileType.EXCEL,
            ".json": FileType.JSON,
            ".parquet": FileType.PARQUET,
            ".tsv": FileType.TSV,
        }
        if ext not in mapping:
            raise ValueError(f"Unsupported file type: {ext}")
        return mapping[ext]
    
    @classmethod
    async def load_file(cls, file_path: Path, file_type: FileType) -> pd.DataFrame:
        """Load data file into DataFrame."""
        loaders = {
            FileType.CSV: lambda p: pd.read_csv(p),
            FileType.TSV: lambda p: pd.read_csv(p, sep="\t"),
            FileType.EXCEL: lambda p: pd.read_excel(p),
            FileType.JSON: lambda p: pd.read_json(p),
            FileType.PARQUET: lambda p: pd.read_parquet(p),
        }
        
        loader = loaders.get(file_type)
        if not loader:
            raise ValueError(f"No loader for file type: {file_type}")
        
        return loader(file_path)
    
    @classmethod
    def store_session(cls, session_id: str, df: pd.DataFrame, metadata: dict[str, Any]) -> None:
        """Store DataFrame in session."""
        cls._sessions[session_id] = df
        cls._metadata[session_id] = metadata
    
    @classmethod
    def get_session(cls, session_id: str) -> pd.DataFrame | None:
        """Retrieve DataFrame from session."""
        return cls._sessions.get(session_id)
    
    @classmethod
    def get_metadata(cls, session_id: str) -> dict[str, Any] | None:
        """Retrieve metadata from session."""
        return cls._metadata.get(session_id)
    
    @classmethod
    def delete_session(cls, session_id: str) -> bool:
        """Delete session data."""
        if session_id in cls._sessions:
            del cls._sessions[session_id]
            del cls._metadata[session_id]
            return True
        return False
    
    @classmethod
    def profile_column(cls, series: pd.Series, name: str) -> ColumnProfile:
        """Generate statistical profile for a column."""
        non_null = series.notna().sum()
        null_count = series.isna().sum()
        total = len(series)
        
        profile = ColumnProfile(
            name=name,
            dtype=str(series.dtype),
            non_null_count=int(non_null),
            null_count=int(null_count),
            null_percentage=round(null_count / total * 100, 2) if total > 0 else 0,
            unique_count=int(series.nunique()),
        )
        
        # Add numeric stats
        if pd.api.types.is_numeric_dtype(series):
            clean = series.dropna()
            if len(clean) > 0:
                profile.mean = round(float(clean.mean()), 4)
                profile.std = round(float(clean.std()), 4)
                profile.min = round(float(clean.min()), 4)
                profile.max = round(float(clean.max()), 4)
                profile.median = round(float(clean.median()), 4)
                profile.q25 = round(float(clean.quantile(0.25)), 4)
                profile.q75 = round(float(clean.quantile(0.75)), 4)
        
        # Add categorical stats for non-numeric or low cardinality
        if not pd.api.types.is_numeric_dtype(series) or series.nunique() < 20:
            value_counts = series.value_counts().head(10)
            profile.top_values = [
                {"value": str(v), "count": int(c), "percentage": round(c / total * 100, 2)}
                for v, c in value_counts.items()
            ]
        
        return profile
    
    @classmethod
    def profile_dataframe(
        cls, 
        df: pd.DataFrame, 
        session_id: str, 
        filename: str, 
        file_type: FileType
    ) -> DataProfile:
        """Generate complete profile for a DataFrame."""
        
        # Column profiles
        columns = [cls.profile_column(df[col], col) for col in df.columns]
        
        # Calculate quality score
        total_cells = df.size
        null_cells = df.isna().sum().sum()
        completeness = (1 - null_cells / total_cells) * 100 if total_cells > 0 else 100
        
        # Check for potential issues
        warnings = []
        for col in columns:
            if col.null_percentage > 50:
                warnings.append(f"Column '{col.name}' has {col.null_percentage}% missing values")
            if col.unique_count == 1:
                warnings.append(f"Column '{col.name}' has only one unique value")
            if col.unique_count == len(df) and col.dtype == "object":
                warnings.append(f"Column '{col.name}' might be an ID column (all unique values)")
        
        # Get sample data (first 5 rows)
        sample = df.head(5).replace({np.nan: None}).to_dict(orient="records")
        
        # Serialize sample data properly
        for row in sample:
            for key, value in row.items():
                if isinstance(value, (np.integer, np.floating)):
                    row[key] = float(value) if isinstance(value, np.floating) else int(value)
                elif pd.isna(value):
                    row[key] = None
        
        return DataProfile(
            session_id=session_id,
            filename=filename,
            file_type=file_type,
            row_count=len(df),
            column_count=len(df.columns),
            memory_usage_mb=round(df.memory_usage(deep=True).sum() / 1024 / 1024, 6),
            columns=columns,
            sample_data=sample,
            quality_score=round(completeness, 1),
            warnings=warnings,
        )

    @classmethod
    def execute_pandas_code(cls, session_id: str, code: str) -> dict[str, Any]:
        """Safely execute pandas code on session data."""
        df = cls.get_session(session_id)
        if df is None:
            raise ValueError(f"Session not found: {session_id}")

        # Create a restricted execution environment
        local_vars = {"df": df.copy(), "pd": pd, "np": np}

        try:
            exec(code, {"__builtins__": {}}, local_vars)
            result = local_vars.get("result")

            if isinstance(result, pd.DataFrame):
                return {"type": "dataframe", "data": result.to_dict(orient="records")}
            elif isinstance(result, pd.Series):
                return {"type": "series", "data": result.to_dict()}
            elif isinstance(result, (int, float, str, bool)):
                return {"type": "scalar", "data": result}
            elif isinstance(result, (list, dict)):
                return {"type": "collection", "data": result}
            else:
                return {"type": "unknown", "data": str(result)}

        except Exception as e:
            raise RuntimeError(f"Code execution failed: {str(e)}")