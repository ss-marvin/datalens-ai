import type { UploadResponse, QueryResponse, DataProfile } from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }
  return response.json();
}

export const api = {
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse<UploadResponse>(response);
  },

  async query(sessionId: string, query: string, includeCode = false): Promise<QueryResponse> {
    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        query,
        include_code: includeCode,
      }),
    });

    return handleResponse<QueryResponse>(response);
  },

  async getProfile(sessionId: string): Promise<DataProfile> {
    const response = await fetch(`${API_BASE}/profile/${sessionId}`);
    return handleResponse<DataProfile>(response);
  },

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/session/${sessionId}`, {
      method: 'DELETE',
    });
    await handleResponse(response);
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse(response);
  },
};
