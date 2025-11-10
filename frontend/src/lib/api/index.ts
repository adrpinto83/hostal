import { api } from './client';
import type { Staff, Occupancy, Maintenance, DashboardStats } from '@/types';

export const staffApi = {
  getAll: async () => {
    const response = await api.get<Staff[]>('/staff');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/staff/stats/summary');
    return response.data;
  },
};

export const occupancyApi = {
  getAll: async () => {
    const response = await api.get<Occupancy[]>('/occupancy');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/occupancy/stats/summary');
    return response.data;
  },
};

export const maintenanceApi = {
  getAll: async () => {
    const response = await api.get<Maintenance[]>('/maintenance');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/maintenance/stats/summary');
    return response.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const [roomsStats, occupancyStats, maintenanceStats, staffStats] = await Promise.all([
      api.get('/rooms/stats/summary'),
      occupancyApi.getStats(),
      maintenanceApi.getStats(),
      staffApi.getStats(),
    ]);

    return {
      rooms: roomsStats.data,
      occupancy: occupancyStats,
      maintenance: maintenanceStats,
      staff: staffStats,
    };
  },
};
