export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Record<string, unknown> | null;
  created_at: string;
}

export type StreamEventType = 'token' | 'tool_call' | 'tool_result' | 'sources' | 'done' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  name?: string;
  args?: Record<string, unknown>;
  run_id?: string;
  files?: string[];
}

export type StreamingStep =
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; runId: string; name: string; args: Record<string, unknown>; result?: string };
