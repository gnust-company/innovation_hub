import apiClient from './client';
import type { User, UserLogin, UserRegister } from '@/types';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  login: async (credentials: UserLogin): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      username: credentials.username,
      password: credentials.password,
    });
    return response.data;
  },

  register: async (data: UserRegister): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>('/auth/password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  updateProfile: async (data: { email?: string | null; full_name?: string; team?: string; avatar_url?: string }): Promise<User> => {
    const response = await apiClient.patch<User>('/users/me', data);
    return response.data;
  },
};
