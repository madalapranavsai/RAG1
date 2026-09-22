export interface User {
  id: string;
  email: string;
  workspace_id: string | null;
  workspace_name: string;
  role: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number;
  total_chunks: number;
  status: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ChunkMatch {
  id: string;
  document_id: string;
  document_title?: string;
  content: string;
  source_page?: number | null;
  similarity: number;
}

export interface Citation {
  id?: string;
  document_id?: string;
  document_title?: string;
  content: string;
  source_page?: number | null;
  similarity?: number;
}

export interface A2UIMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface A2UIPayload {
  type: 'metric_card' | 'table' | 'bar_chart' | 'line_chart' | 'mermaid' | 'timeline';
  title?: string;
  metrics?: A2UIMetric[];
  headers?: string[];
  rows?: (string | number)[][];
  labels?: string[];
  datasets?: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
  definition?: string;
  events?: {
    date: string;
    title: string;
    description: string;
  }[];
}

export interface CragStatus {
  search_query?: string;
  rewritten?: boolean;
  chunks_retrieved?: number;
  chunks_retained?: number;
  grade?: string;
}

export interface ChatMessage {
  id?: string;
  chat_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  a2ui_payload?: A2UIPayload | null;
  created_at?: string;
  follow_up_questions?: string[];
  crag_status?: CragStatus | null;
}

export interface ChatSession {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface UsageStats {
  workspace: {
    id: string;
    name: string;
    created_at: string;
  };
  metrics: {
    total_documents: number;
    total_chunks: number;
    total_tokens_used: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  recent_events: {
    id: string;
    event_type: string;
    quantity: number;
    created_at: string;
    metadata?: Record<string, any>;
  }[];
}
