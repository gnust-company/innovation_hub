import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chatStore';
import { chatApi } from '@/api/chat';
import type { ChatMessage, StreamEvent, StreamingStep } from '@/types/chat';

const ERROR_KEY_MAP: Record<string, string> = {
  NO_API_KEY: 'chat.error_no_api_key',
  AUTH_FAILED: 'chat.error_auth_failed',
  RATE_LIMITED: 'chat.error_rate_limited',
  TIMEOUT: 'chat.error_timeout',
  CONNECTION_ERROR: 'chat.error_connection',
  STREAM_ERROR: 'chat.error_stream',
};

function mapSSEError(content: string): string {
  if (ERROR_KEY_MAP[content]) return ERROR_KEY_MAP[content];
  // If it's a raw error code we don't recognize, return generic
  if (content.length < 30 && /^[A-Z_]+$/.test(content)) return 'chat.error_stream';
  return content;
}

function parseSSELine(line: string): StreamEvent | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as StreamEvent;
  } catch {
    return null;
  }
}

export function useChat() {
  const { t } = useTranslation();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const store = useChatStore.getState();
    if (!content.trim() || store.isStreaming) return;

    store.addUserMessage(content);
    store.setStreaming(true);
    store.clearError();

    // Abort any previous stream — can't have two simultaneous streams
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      let sessionId = store.currentSessionId;

      if (!sessionId) {
        const title = content.length > 50 ? content.slice(0, 50) + '...' : content;
        const session = await store.createSession(title);
        sessionId = session.id;
      }

      const response = await chatApi.streamMessage(sessionId, content);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let answerContent = '';
      let sources: string[] | null = null;
      let thinkingBuffer = '';
      let hasToolCalls = false;
      const streamSessionId = sessionId;
      useChatStore.getState().setStreamingSessionId(sessionId);

      const isSessionStillActive = () =>
        useChatStore.getState().currentSessionId === streamSessionId;

      const flushThinking = () => {
        if (thinkingBuffer.trim()) {
          if (isSessionStillActive()) {
            useChatStore.getState().addStreamingStep({ type: 'thinking', content: thinkingBuffer.trim() });
          }
          thinkingBuffer = '';
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const event = parseSSELine(line);
          if (!event) continue;

          const active = isSessionStillActive();

          switch (event.type) {
            case 'token': {
              const token = event.content || '';
              fullContent += token;
              if (active) {
                if (!hasToolCalls) {
                  thinkingBuffer += token;
                  useChatStore.getState().setStreamingContent(fullContent);
                } else {
                  answerContent += token;
                  useChatStore.getState().setStreamingContent(answerContent);
                }
              }
              break;
            }
            case 'tool_call': {
              hasToolCalls = true;
              flushThinking();
              answerContent = '';
              if (active) {
                useChatStore.getState().setStreamingContent('');
                const step: StreamingStep = {
                  type: 'tool_call',
                  runId: event.run_id || `tool-${Date.now()}`,
                  name: event.name || 'tool',
                  args: event.args || {},
                };
                useChatStore.getState().addStreamingStep(step);
              }
              break;
            }
            case 'tool_result': {
              if (active) {
                const rid = event.run_id || '';
                if (rid) {
                  useChatStore.getState().updateToolResult(rid, event.content || '');
                }
              }
              break;
            }
            case 'sources':
              if (event.files) {
                sources = event.files;
                if (active) useChatStore.getState().setStreamingSources(event.files);
              }
              break;
            case 'done': {
              if (active) {
                flushThinking();
                const msg: ChatMessage = {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content: hasToolCalls ? answerContent : fullContent,
                  sources: sources ? { files: sources } : null,
                  created_at: new Date().toISOString(),
                };
                useChatStore.getState().finalizeAssistantMessage(msg);
              } else {
                useChatStore.getState().setStreamingSessionId(null);
              }
              break;
            }
            case 'error':
              if (active) {
                const errorKey = mapSSEError(event.content || '');
                useChatStore.getState().setError(t(errorKey));
                useChatStore.getState().setStreaming(false);
              }
              useChatStore.getState().setStreamingSessionId(null);
              break;
          }
        }
      }

      // If stream ended without 'done' and session is still active
      if (isSessionStillActive() && useChatStore.getState().isStreaming) {
        flushThinking();
        const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: hasToolCalls ? answerContent : fullContent,
          sources: sources ? { files: sources } : null,
          created_at: new Date().toISOString(),
        };
        useChatStore.getState().finalizeAssistantMessage(msg);
      } else {
        useChatStore.getState().setStreamingSessionId(null);
      }

      useChatStore.getState().fetchSessions();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      useChatStore.getState().setError(error instanceof Error ? error.message : 'Failed to send message');
      useChatStore.getState().setStreaming(false);
      useChatStore.getState().setStreamingSessionId(null);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    useChatStore.getState().setStreaming(false);
  }, []);

  return { sendMessage, stopStreaming };
}
