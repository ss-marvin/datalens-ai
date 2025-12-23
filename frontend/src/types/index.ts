export interface ColumnProfile {
  name: string;
  dtype: string;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
  q25?: number;
  q75?: number;
  top_values?: Array<{
    value: string;
    count: number;
    percentage: number;
  }>;
}

export interface DataProfile {
  session_id: string;
  filename: string;
  file_type: string;
  row_count: number;
  column_count: number;
  memory_usage_mb: number;
  columns: ColumnProfile[];
  sample_data: Record<string, unknown>[];
  quality_score: number;
  warnings: string[];
}

export interface UploadResponse {
  success: boolean;
  session_id: string;
  message: string;
  profile?: DataProfile;
}

export type ChartType = 'line' | 'bar' | 'area' | 'scatter' | 'pie' | 'histogram' | 'heatmap';

export interface ChartData {
  type: ChartType;
  title: string;
  data: Record<string, unknown>[];
  x_key?: string;
  y_keys: string[];
  config?: Record<string, unknown>;
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  data?: Record<string, unknown>[];
  chart?: ChartData;
  code?: string;
  execution_time_ms: number;
}

export interface QueryMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  chart?: ChartData;
  data?: Record<string, unknown>[];
  code?: string;
  timestamp: Date;
  executionTime?: number;
}

export interface AppState {
  sessionId: string | null;
  profile: DataProfile | null;
  messages: QueryMessage[];
  isLoading: boolean;
  error: string | null;
}
