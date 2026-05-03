import apiClient from './client';
import { API_BASE_URL } from '@/utils/constants';
import type { ChatSession, ChatMessage } from '@/types/chat';

export const chatApi = {
  createSession: async (title: string): Promise<ChatSession> => {
    const { data } = await apiClient.post<ChatSession>('/chat/sessions', { title });
    return data;
  },

  listSessions: async (): Promise<ChatSession[]> => {
    const { data } = await apiClient.get<ChatSession[]>('/chat/sessions');
    return data;
  },

  updateSession: async (id: string, title: string): Promise<ChatSession> => {
    const { data } = await apiClient.patch<ChatSession>(`/chat/sessions/${id}`, { title });
    return data;
  },

  deleteSession: async (id: string): Promise<void> => {
    await apiClient.delete(`/chat/sessions/${id}`);
  },

  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
    return data;
  },

  streamMessage: async (sessionId: string, content: string): Promise<Response> => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status}`);
    }
    return response;
  },
};
