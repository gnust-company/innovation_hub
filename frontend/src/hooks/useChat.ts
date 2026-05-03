import { useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { chatApi } from '@/api/chat';
import type { ChatMessage, StreamEvent, StreamingStep } from '@/types/chat';

function parseSSELine(line: string): StreamEvent | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as StreamEvent;
  } catch {
    return null;
  }
}

let activeAbort: AbortController | null = null;

/** Hard abort — only used when sending a NEW message (can't have 2 streams). */
export function abortActiveStream() {
  activeAbort?.abort();
  activeAbort = null;
  const s = useChatStore.getState();
  if (s.isStreaming) {
    s.setStreaming(false);
    s.setStreamingContent('');
    s.setStreamingSources([]);
    s.setStreamingSessionId(null);
  }
}

export function useChat() {
  const sendMessage = useCallback(async (content: string) => {
    const store = useChatStore.getState();
    if (!content.trim() || store.isStreaming) return;

    store.addUserMessage(content);
    store.setStreaming(true);
    store.clearError();

    // Abort any previous stream — can't have two simultaneous streams
    activeAbort?.abort();
    activeAbort = new AbortController();

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
              // Backend saves the message regardless of active session
              // Only update UI if user is still viewing this session
              if (active) {
                flushThinking();
                const msg: ChatMessage = {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content: fullContent,
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
                useChatStore.getState().setError(event.content || 'Streaming error');
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
          content: fullContent,
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
    activeAbort?.abort();
    activeAbort = null;
    useChatStore.getState().setStreaming(false);
  }, []);

  return { sendMessage, stopStreaming };
}
