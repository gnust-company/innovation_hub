import { create } from 'zustand';
import { chatApi } from '@/api/chat';
import type { ChatSession, ChatMessage, StreamingStep } from '@/types/chat';

interface ChatState {
  isPanelOpen: boolean;
  showSidebar: boolean;
  isFullscreen: boolean;

  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: ChatMessage[];

  isStreaming: boolean;
  streamingSessionId: string | null;
  streamingContent: string;
  streamingSources: string[] | null;
  streamingSteps: StreamingStep[];

  isLoadingSessions: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  // Panel
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setShowSidebar: (show: boolean) => void;
  toggleFullscreen: () => void;

  // Sessions
  fetchSessions: () => Promise<void>;
  createSession: (title: string) => Promise<ChatSession>;
  selectSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  startNewChat: () => void;

  // Messages
  fetchMessages: (sessionId: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  appendStreamingToken: (token: string) => void;
  setStreamingContent: (content: string) => void;
  setStreamingSources: (files: string[]) => void;
  addStreamingStep: (step: StreamingStep) => void;
  updateToolResult: (runId: string, result: string) => void;
  finalizeAssistantMessage: (message: ChatMessage) => void;
  setStreaming: (isStreaming: boolean) => void;
  setStreamingSessionId: (id: string | null) => void;

  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isPanelOpen: false,
  showSidebar: true,
  isFullscreen: false,
  sessions: [],
  currentSessionId: null,
  messages: [],
  isStreaming: false,
  streamingSessionId: null,
  streamingContent: '',
  streamingSources: null,
  streamingSteps: [],
  isLoadingSessions: false,
  isLoadingMessages: false,
  error: null,

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => {
    const isOpen = !get().isPanelOpen;
    set({ isPanelOpen: isOpen });
    if (isOpen && get().sessions.length === 0) {
      get().fetchSessions();
    }
  },
  setShowSidebar: (show) => set({ showSidebar: show }),

  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen, showSidebar: true })),

  fetchSessions: async () => {
    set({ isLoadingSessions: true, error: null });
    try {
      const sessions = await chatApi.listSessions();
      set({ sessions, isLoadingSessions: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch sessions', isLoadingSessions: false });
    }
  },

  createSession: async (title: string) => {
    const session = await chatApi.createSession(title);
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: session.id,
    }));
    return session;
  },

  selectSession: async (sessionId: string) => {
    const { streamingSessionId } = get();
    if (streamingSessionId === sessionId) {
      // Returning to a session that's still streaming — restore streaming UI
      set({ currentSessionId: sessionId, isStreaming: true });
    } else {
      // Different session — soft reset, don't abort background stream
      set({ currentSessionId: sessionId, messages: [], streamingContent: '', streamingSteps: [], streamingSources: null, isStreaming: false });
    }
    await get().fetchMessages(sessionId);
  },

  deleteSession: async (sessionId: string) => {
    await chatApi.deleteSession(sessionId);
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      const isCurrentDeleted = state.currentSessionId === sessionId;
      return {
        sessions,
        currentSessionId: isCurrentDeleted ? null : state.currentSessionId,
        messages: isCurrentDeleted ? [] : state.messages,
      };
    });
  },

  updateSessionTitle: async (sessionId: string, title: string) => {
    const updated = await chatApi.updateSession(sessionId, title);
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === sessionId ? updated : s)),
    }));
  },

  startNewChat: () => {
    // Soft reset UI — don't abort stream, let it continue in background
    set({ currentSessionId: null, messages: [], streamingContent: '', streamingSources: null, streamingSteps: [], isStreaming: false });
  },

  fetchMessages: async (sessionId: string) => {
    set({ isLoadingMessages: true });
    try {
      const messages = await chatApi.getMessages(sessionId);
      set({ messages, isLoadingMessages: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch messages', isLoadingMessages: false });
    }
  },

  addUserMessage: (content: string) => {
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      sources: null,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, optimisticMessage] }));
  },

  setStreamingContent: (content: string) => set({ streamingContent: content }),
  appendStreamingToken: (token: string) => set((state) => ({ streamingContent: state.streamingContent + token })),
  setStreamingSources: (files: string[]) => set({ streamingSources: files }),

  addStreamingStep: (step: StreamingStep) => set((state) => ({
    streamingSteps: [...state.streamingSteps, step],
  })),

  updateToolResult: (runId: string, result: string) => set((state) => ({
    streamingSteps: state.streamingSteps.map((s) =>
      s.type === 'tool_call' && s.runId === runId ? { ...s, result } : s
    ),
  })),

  finalizeAssistantMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message],
      streamingContent: '',
      streamingSources: null,
      streamingSteps: [],
      isStreaming: false,
      streamingSessionId: null,
    }));
  },

  setStreaming: (isStreaming: boolean) => set({ isStreaming }),
  setStreamingSessionId: (id) => set({ streamingSessionId: id }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
}));
