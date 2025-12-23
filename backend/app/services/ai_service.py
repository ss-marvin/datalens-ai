import anthropic
import json
import re
import time
from typing import Any

from ..config import get_settings
from ..models import QueryResponse, ChartData, ChartType
from .data_service import DataService


class AIService:
    """Service for AI-powered data analysis using Claude."""
    
    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.ai_model
        self.max_tokens = settings.max_tokens
    
    def _build_system_prompt(self, df_info: str, columns: list[str]) -> str:
        """Build system prompt with data context."""
        return f"""You are DataLens AI, an expert data analyst assistant. You help users analyze their data using natural language.

## Your Capabilities
- Answer questions about data using pandas
- Generate Python code to analyze data
- Suggest appropriate visualizations
- Explain insights clearly

## Current Dataset Context
{df_info}

## Available Columns
{', '.join(columns)}

## Response Format
Always respond with valid JSON in this exact structure:
{{
    "answer": "Your natural language explanation of the results",
    "code": "# Python code using pandas\\nresult = df['column'].mean()",
    "chart": {{
        "type": "bar|line|area|scatter|pie|histogram",
        "title": "Chart title",
        "x_key": "column_name_for_x_axis",
        "y_keys": ["column_name_for_y_axis"],
        "data": [{{"x_value": "A", "y_value": 100}}]
    }}
}}

## Rules
1. The `code` field should contain executable Python code that operates on a DataFrame named `df`
2. Store the final result in a variable called `result`
3. Include `chart` only when visualization is appropriate
4. Keep answers concise but informative
5. Use Swedish if the user writes in Swedish, otherwise use English
6. For chart data, always provide actual computed values, not placeholders
7. If you cannot answer the question, explain why clearly

## Chart Type Guidelines
- Time series → line or area
- Comparisons → bar
- Distributions → histogram
- Correlations → scatter
- Proportions → pie (only for <7 categories)
"""

    def _build_user_prompt(self, query: str, sample_data: str) -> str:
        """Build user prompt with query and sample data."""
        return f"""## Sample Data (first 3 rows)
{sample_data}

## User Question
{query}

Analyze the data and respond with JSON only. No markdown formatting around the JSON."""

    def _parse_response(self, response_text: str) -> dict[str, Any]:
        """Parse and validate AI response."""
        # Try to extract JSON from response
        text = response_text.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON object in response
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
            
            # Return basic response if parsing fails
            return {
                "answer": response_text,
                "code": None,
                "chart": None
            }
    
    async def query(self, session_id: str, user_query: str, include_code: bool = False) -> QueryResponse:
        """Process natural language query and return analysis."""
        start_time = time.time()
        
        # Get session data
        df = DataService.get_session(session_id)
        if df is None:
            return QueryResponse(
                success=False,
                answer=f"Session not found: {session_id}. Please upload a file first.",
                execution_time_ms=0
            )
        
        # Build prompts
        df_info = f"Shape: {df.shape[0]} rows × {df.shape[1]} columns\nTypes:\n{df.dtypes.to_string()}"
        columns = df.columns.tolist()
        sample_data = df.head(3).to_string()
        
        system_prompt = self._build_system_prompt(df_info, columns)
        user_prompt = self._build_user_prompt(user_query, sample_data)
        
        try:
            # Call Claude API
            message = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
                system=system_prompt
            )
            
            response_text = message.content[0].text
            parsed = self._parse_response(response_text)
            
            # Execute code if present
            result_data = None
            if parsed.get("code"):
                try:
                    exec_result = DataService.execute_pandas_code(session_id, parsed["code"])
                    if exec_result["type"] == "dataframe":
                        result_data = exec_result["data"]
                    elif exec_result["type"] in ["series", "collection"]:
                        result_data = exec_result["data"] if isinstance(exec_result["data"], list) else [exec_result["data"]]
                except Exception as e:
                    parsed["answer"] += f"\n\n⚠️ Code execution note: {str(e)}"
            
            # Build chart data if present
            chart = None
            if parsed.get("chart"):
                chart_info = parsed["chart"]
                try:
                    chart = ChartData(
                        type=ChartType(chart_info.get("type", "bar")),
                        title=chart_info.get("title", ""),
                        data=chart_info.get("data", []),
                        x_key=chart_info.get("x_key"),
                        y_keys=chart_info.get("y_keys", []),
                        config=chart_info.get("config", {})
                    )
                except Exception:
                    pass  # Skip invalid chart data
            
            execution_time = (time.time() - start_time) * 1000
            
            return QueryResponse(
                success=True,
                answer=parsed.get("answer", "Analysis complete."),
                data=result_data,
                chart=chart,
                code=parsed.get("code") if include_code else None,
                execution_time_ms=round(execution_time, 2)
            )
            
        except anthropic.APIError as e:
            return QueryResponse(
                success=False,
                answer=f"AI service error: {str(e)}",
                execution_time_ms=(time.time() - start_time) * 1000
            )
        except Exception as e:
            return QueryResponse(
                success=False,
                answer=f"Unexpected error: {str(e)}",
                execution_time_ms=(time.time() - start_time) * 1000
            )


# Singleton instance
_ai_service: AIService | None = None


def get_ai_service() -> AIService:
    """Get or create AI service instance."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
