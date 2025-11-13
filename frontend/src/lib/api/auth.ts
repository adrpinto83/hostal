import { api } from './client';
import type { LoginRequest, LoginResponse, User } from '@/types';

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  document_id?: string;
}

export interface RegisterResponse {
  message: string;
  user_id: number;
  email: string;
  status: string;
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<LoginResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', {
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone: data.phone,
      document_id: data.document_id,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  getPendingUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/auth/pending-users');
    return response.data;
  },

  approveUser: async (userId: number, approved: boolean, role?: string): Promise<any> => {
    const response = await api.post(`/auth/approve-user/${userId}`, {
      approved,
      role: role || 'recepcionista',
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },
};
