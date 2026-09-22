import type { User, DocumentItem, ChunkMatch, ChatSession, ChatMessage, UsageStats } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('documind_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    localStorage.removeItem('documind_token');
    // If not already on auth page, redirect
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    let errorMsg = `Error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const data = await request<{ success: boolean; token: string }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        localStorage.setItem('documind_token', data.token);
      }
      return data;
    },
    signup: async (email: string, password: string) => {
      const data = await request<{ success: boolean; message: string; session_active: boolean }>('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return data;
    },
    logout: async () => {
      localStorage.removeItem('documind_token');
      return request<{ success: boolean }>('/auth/logout', { method: 'POST' });
    },
    getMe: async (): Promise<User> => {
      return request<User>('/auth/me');
    },
  },

  documents: {
    list: async (): Promise<{ documents: DocumentItem[] }> => {
      return request<{ documents: DocumentItem[] }>('/documents');
    },
    upload: async (file: File): Promise<{ success: boolean; document_id: string; chunks_created: number }> => {
      const formData = new FormData();
      formData.append('file', file);
      return request<{ success: boolean; document_id: string; chunks_created: number }>('/documents/upload', {
        method: 'POST',
        body: formData,
      });
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      return request<{ success: boolean }>(`/documents/${id}`, {
        method: 'DELETE',
      });
    },
    search: async (
      query: string,
      matchThreshold = 0.2,
      matchCount = 5
    ): Promise<{ query: string; total_matches: number; matches: ChunkMatch[] }> => {
      return request<{ query: string; total_matches: number; matches: ChunkMatch[] }>('/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          match_threshold: matchThreshold,
          match_count: matchCount,
        }),
      });
    },
  },

  chat: {
    listSessions: async (): Promise<{ chats: ChatSession[] }> => {
      return request<{ chats: ChatSession[] }>('/chat/sessions');
    },
    createSession: async (): Promise<{ chat: ChatSession }> => {
      return request<{ chat: ChatSession }>('/chat/sessions', {
        method: 'POST',
      });
    },
    deleteSession: async (id: string): Promise<{ success: boolean }> => {
      return request<{ success: boolean }>(`/chat/sessions/${id}`, {
        method: 'DELETE',
      });
    },
    getMessages: async (chatId: string): Promise<{ messages: ChatMessage[] }> => {
      return request<{ messages: ChatMessage[] }>(`/chat/sessions/${chatId}/messages`);
    },
    sendMessage: async (
      chatId: string,
      content: string
    ): Promise<{
      success: boolean;
      response: string;
      citations: any[];
      follow_up_questions?: string[];
      a2ui_payload?: any;
    }> => {
      return request(`/chat/sessions/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    },
  },

  usage: {
    getStats: async (): Promise<UsageStats> => {
      return request<UsageStats>('/usage/stats');
    },
  },
};
