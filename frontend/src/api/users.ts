import apiClient from './client';
import type { User, PaginatedResponse } from '@/types';

interface UserStats {
  problems_count: number;
  ideas_count: number;
  comments_count: number;
  rooms_count: number;
}

interface AdminUpdateUser {
  full_name?: string;
  team?: string;
  role?: 'member' | 'admin';
  is_active?: boolean;
}

interface UserListParams {
  page?: number;
  limit?: number;
  role?: string;
  team?: string;
  search?: string;
  is_active?: boolean;
}

export const usersApi = {
  list: async (params: UserListParams = {}): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  },

  getById: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${userId}`);
    return response.data;
  },

  getStats: async (userId: string): Promise<UserStats> => {
    const response = await apiClient.get<UserStats>(`/users/${userId}/stats`);
    return response.data;
  },

  adminUpdate: async (userId: string, data: AdminUpdateUser): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${userId}`, data);
    return response.data;
  },

  adminDelete: async (userId: string): Promise<void> => {
    await apiClient.delete(`/users/${userId}`);
  },

  adminResetPassword: async (userId: string): Promise<{ new_password: string }> => {
    const response = await apiClient.post<{ new_password: string }>(`/users/${userId}/reset-password`);
    return response.data;
  },

  // LLM API Key
  saveLlmApiKey: async (key: string): Promise<{ saved: boolean; valid?: boolean; reason?: string; detail?: string }> => {
    const { data } = await apiClient.put('/users/me/llm-api-key', { llm_api_key: key });
    return data;
  },
  deleteLlmApiKey: async (): Promise<void> => {
    await apiClient.delete('/users/me/llm-api-key');
  },
  checkLlmApiKey: async (): Promise<{ has_key: boolean }> => {
    const { data } = await apiClient.get('/users/me/llm-api-key');
    return data;
  },
  getKeyHelpUrl: async (): Promise<{ url: string }> => {
    const { data } = await apiClient.get('/chat/key-help-url');
    return data;
  },
};
