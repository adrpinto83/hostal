import { api } from './client';

export interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  resource_type: string;
  resource_id: number | null;
  description: string | null;
  details: string | null;
  success: boolean;
  ip_address: string | null;
}

export interface AuditSummary {
  user_id: number;
  user_email: string;
  user_role: string;
  total_actions: number;
  last_action: string;
  failed_actions: number;
  successful_actions: number;
}

export const auditApi = {
  // Obtener logs con filtros
  getLogs: async (filters?: {
    user_id?: number;
    user_email?: string;
    action?: string;
    resource_type?: string;
    resource_id?: number;
    success?: boolean;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get<AuditLog[]>('/audit/logs', { params: filters });
    return response.data;
  },

  // Obtener logs de un usuario específico
  getUserLogs: async (userId: number, limit: number = 100, offset: number = 0) => {
    const response = await api.get<AuditLog[]>(`/audit/logs/user/${userId}`, {
      params: { limit, offset },
    });
    return response.data;
  },

  // Obtener resumen de actividad
  getSummary: async (days: number = 7) => {
    const response = await api.get<AuditSummary[]>('/audit/summary', {
      params: { days },
    });
    return response.data;
  },

  // Obtener acciones disponibles
  getAvailableActions: async () => {
    const response = await api.get<string[]>('/audit/actions');
    return response.data;
  },

  // Obtener tipos de recursos disponibles
  getAvailableResourceTypes: async () => {
    const response = await api.get<string[]>('/audit/resource-types');
    return response.data;
  },
};
