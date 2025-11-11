import { api } from './client';
import type {
  Staff,
  Occupancy,
  Maintenance,
  DashboardStats,
  Room,
  RoomCreate,
  RoomUpdate,
  Guest,
  GuestCreate,
  GuestUpdate,
  Device,
  DeviceCreate,
  Payment,
  PaymentCreate,
  PaymentUpdate,
  PaymentStats,
  PaymentsByDate,
  GuestPaymentReport,
  BandwidthSummary,
  DeviceBandwidth,
  GuestBandwidth,
  Media,
  MediaStats
} from '@/types';

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

export const roomsApi = {
  getAll: async () => {
    const response = await api.get<Room[]>('/rooms/');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Room>(`/rooms/${id}`);
    return response.data;
  },
  create: async (data: RoomCreate) => {
    const response = await api.post<Room>('/rooms/', data);
    return response.data;
  },
  update: async (id: number, data: RoomUpdate) => {
    const response = await api.patch<Room>(`/rooms/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/rooms/${id}`);
  },
  getStats: async () => {
    const response = await api.get('/rooms/stats/summary');
    return response.data;
  },
};

export const guestsApi = {
  getAll: async (search?: string) => {
    const params = search ? { search } : {};
    const response = await api.get<Guest[]>('/guests/', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Guest>(`/guests/${id}`);
    return response.data;
  },
  create: async (data: GuestCreate) => {
    const response = await api.post<Guest>('/guests/', data);
    return response.data;
  },
  update: async (id: number, data: GuestUpdate) => {
    const response = await api.patch<Guest>(`/guests/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/guests/${id}`);
  },
};

export const devicesApi = {
  getByGuest: async (guestId: number) => {
    const response = await api.get<Device[]>(`/guests/${guestId}/devices`);
    return response.data;
  },
  create: async (guestId: number, data: DeviceCreate) => {
    const response = await api.post<Device>(`/guests/${guestId}/devices`, data);
    return response.data;
  },
  delete: async (guestId: number, deviceId: number) => {
    await api.delete(`/guests/${guestId}/devices/${deviceId}`);
  },
  suspend: async (deviceId: number, reason?: string) => {
    await api.post(`/internet-control/devices/${deviceId}/suspend`, { reason });
  },
  resume: async (deviceId: number) => {
    await api.post(`/internet-control/devices/${deviceId}/resume`);
  },
};

// Payments API
export const paymentsApi = {
  getAll: async (params?: {
    guest_id?: number;
    currency?: string;
    method?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get<{ total: number; payments: Payment[] }>('/payments/', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Payment>(`/payments/${id}`);
    return response.data;
  },
  create: async (data: PaymentCreate) => {
    const response = await api.post<Payment>('/payments/', data);
    return response.data;
  },
  update: async (id: number, data: PaymentUpdate) => {
    const response = await api.patch<Payment>(`/payments/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/payments/${id}`);
  },
  getStats: async (days: number = 30) => {
    const response = await api.get<PaymentStats>('/payments/stats/summary', {
      params: { days }
    });
    return response.data;
  },
  getByDate: async (startDate: string, endDate: string, currency?: string) => {
    const response = await api.get<PaymentsByDate>('/payments/reports/by-date', {
      params: { start_date: startDate, end_date: endDate, currency }
    });
    return response.data;
  },
  getByGuest: async (guestId: number) => {
    const response = await api.get<GuestPaymentReport>(`/payments/reports/by-guest/${guestId}`);
    return response.data;
  },
  export: async (startDate: string, endDate: string) => {
    const response = await api.get('/payments/reports/export', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
};

// Bandwidth API
export const bandwidthApi = {
  getSummary: async (days: number = 7) => {
    const response = await api.get<BandwidthSummary>('/internet-control/bandwidth/summary', {
      params: { days }
    });
    return response.data;
  },
  getDeviceBandwidth: async (deviceId: number, days: number = 30) => {
    const response = await api.get<DeviceBandwidth>(`/internet-control/devices/${deviceId}/bandwidth`, {
      params: { days }
    });
    return response.data;
  },
  getGuestBandwidth: async (guestId: number, days: number = 30) => {
    const response = await api.get<GuestBandwidth>(`/internet-control/guests/${guestId}/bandwidth`, {
      params: { days }
    });
    return response.data;
  },
  getRecentActivity: async (hours: number = 24, activityType?: string, limit: number = 50) => {
    const response = await api.get('/internet-control/activity/recent', {
      params: { hours, activity_type: activityType, limit }
    });
    return response.data;
  },
};

// Media API
export const mediaApi = {
  upload: async (formData: FormData) => {
    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAll: async (params?: {
    guest_id?: number;
    room_id?: number;
    category?: string;
    limit?: number;
  }) => {
    const response = await api.get<Media[]>('/media/', { params });
    return response.data;
  },

  delete: async (mediaId: number) => {
    const response = await api.delete(`/media/${mediaId}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<MediaStats>('/media/stats');
    return response.data;
  },
};
