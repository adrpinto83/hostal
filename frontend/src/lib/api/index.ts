import { api } from './client';
import type {
  Staff,
  StaffCreate,
  StaffUpdate,
  Occupancy,
  OccupancyCreate,
  OccupancyCheckOut,
  Maintenance,
  MaintenanceCreate,
  MaintenanceUpdate,
  DashboardStats,
  Room,
  RoomCreate,
  RoomUpdate,
  RoomRate,
  RoomRateCreate,
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
  MediaStats,
  User,
  UserCreate,
  UserUpdate,
  Reservation,
  ReservationCreate,
  ReservationUpdate,
  ExchangeRatesResponse,
  ConversionResult,
  MultiConversionResult,
  InternetStatus,
  NetworkActivity,
  HealthCheck
} from '@/types';

// Staff API (Complete)
export const staffApi = {
  getAll: async (params?: {
    role?: string;
    status?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get<Staff[]>('/staff/', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Staff>(`/staff/${id}`);
    return response.data;
  },
  create: async (data: StaffCreate) => {
    const response = await api.post<Staff>('/staff/', data);
    return response.data;
  },
  update: async (id: number, data: StaffUpdate) => {
    const response = await api.patch<Staff>(`/staff/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/staff/${id}`);
  },
  changeStatus: async (id: number, status: 'active' | 'inactive' | 'on_leave') => {
    const response = await api.post(`/staff/${id}/change-status`, { status });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/staff/stats/summary');
    return response.data;
  },
};

// Occupancy API (Complete)
export const occupancyApi = {
  getAll: async (params?: {
    room_id?: number;
    guest_id?: number;
    active_only?: boolean;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get<Occupancy[]>('/occupancy/', { params });
    return response.data;
  },
  getActive: async () => {
    const response = await api.get<Occupancy[]>('/occupancy/active');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Occupancy>(`/occupancy/${id}`);
    return response.data;
  },
  checkIn: async (data: OccupancyCreate) => {
    const response = await api.post<Occupancy>('/occupancy/check-in', data);
    return response.data;
  },
  checkOut: async (id: number, data?: OccupancyCheckOut) => {
    const response = await api.post<Occupancy>(`/occupancy/${id}/check-out`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/occupancy/${id}`);
  },
  getStats: async () => {
    const response = await api.get('/occupancy/stats/summary');
    return response.data;
  },
};

// Maintenance API (Complete)
export const maintenanceApi = {
  getAll: async (params?: {
    room_id?: number;
    type?: string;
    priority?: string;
    status?: string;
    assigned_to?: number;
    pending_only?: boolean;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get<Maintenance[]>('/maintenance/', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Maintenance>(`/maintenance/${id}`);
    return response.data;
  },
  create: async (data: MaintenanceCreate) => {
    const response = await api.post<Maintenance>('/maintenance/', data);
    return response.data;
  },
  update: async (id: number, data: MaintenanceUpdate) => {
    const response = await api.patch<Maintenance>(`/maintenance/${id}`, data);
    return response.data;
  },
  start: async (id: number) => {
    const response = await api.post<Maintenance>(`/maintenance/${id}/start`);
    return response.data;
  },
  complete: async (id: number, actual_cost?: number, notes?: string) => {
    const response = await api.post<Maintenance>(`/maintenance/${id}/complete`, null, {
      params: { actual_cost, notes }
    });
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/maintenance/${id}`);
  },
  getStats: async () => {
    const response = await api.get('/maintenance/stats/summary');
    return response.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const [roomsStats, occupancyStats, maintenanceStats, staffStats] = await Promise.all([
      roomsApi.getStats(),
      occupancyApi.getStats(),
      maintenanceApi.getStats(),
      staffApi.getStats(),
    ]);

    return {
      rooms: roomsStats,
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
    await api.post(`/internet-control/devices/${deviceId}/suspend`, null, {
      params: reason ? { reason } : {},
    });
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

// Media API (Already complete)
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

// Users API (NEW)
export const usersApi = {
  create: async (data: UserCreate) => {
    const response = await api.post<User>('/users/', data);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get<User>('/users/me');
    return response.data;
  },
  getAll: async () => {
    const response = await api.get<User[]>('/users/');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },
  update: async (id: number, data: UserUpdate) => {
    const response = await api.patch<User>(`/users/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  bootstrap: async (data: UserCreate) => {
    const response = await api.post<User>('/users/bootstrap', data);
    return response.data;
  },
  assignStaff: async (userId: number, staffId: number) => {
    const response = await api.post(`/users/${userId}/assign-staff`, { staff_id: staffId });
    return response.data;
  },
  unassignStaff: async (userId: number) => {
    const response = await api.post(`/users/${userId}/unassign-staff`);
    return response.data;
  },
};

// Reservations API (NEW)
export const reservationsApi = {
  create: async (data: ReservationCreate) => {
    const response = await api.post<Reservation>('/reservations/', data);
    return response.data;
  },
  getAll: async (params?: {
    guest_id?: number;
    room_id?: number;
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get<Reservation[]>('/reservations/', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Reservation>(`/reservations/${id}`);
    return response.data;
  },
  update: async (id: number, data: ReservationUpdate) => {
    const response = await api.patch<Reservation>(`/reservations/${id}`, data);
    return response.data;
  },
  confirm: async (id: number) => {
    const response = await api.post<Reservation>(`/reservations/${id}/confirm`);
    return response.data;
  },
  cancel: async (id: number, reason?: string) => {
    const response = await api.post<Reservation>(`/reservations/${id}/cancel`, { reason });
    return response.data;
  },
};

// Room Rates API (NEW)
export const roomRatesApi = {
  create: async (roomId: number, data: RoomRateCreate) => {
    const response = await api.post<RoomRate>(`/rooms/${roomId}/rates`, data);
    return response.data;
  },
  getByRoom: async (roomId: number) => {
    const response = await api.get<RoomRate[]>(`/rooms/${roomId}/rates`);
    return response.data;
  },
  delete: async (rateId: number) => {
    await api.delete(`/rooms/rates/${rateId}`);
  },
};

// Exchange Rates API (NEW)
export const exchangeRatesApi = {
  update: async () => {
    const response = await api.post('/exchange-rates/update');
    return response.data;
  },
  getLatest: async (baseCurrency: string = 'USD') => {
    const response = await api.get<ExchangeRatesResponse>('/exchange-rates/latest', {
      params: { base_currency: baseCurrency }
    });
    return response.data;
  },
  convert: async (amount: number, fromCurrency: string, toCurrency: string) => {
    const response = await api.post<ConversionResult>('/exchange-rates/convert', null, {
      params: { amount, from_currency: fromCurrency, to_currency: toCurrency }
    });
    return response.data;
  },
  convertAll: async (amount: number, fromCurrency: string) => {
    const response = await api.post<MultiConversionResult>('/exchange-rates/convert-all', null, {
      params: { amount, from_currency: fromCurrency }
    });
    return response.data;
  },
};

// Internet Control API (Extended with missing endpoints)
export const internetControlApi = {
  // Device control (already implemented via devicesApi)
  suspendDevice: async (deviceId: number, reason?: string) => {
    await api.post(`/internet-control/devices/${deviceId}/suspend`, { reason });
  },
  resumeDevice: async (deviceId: number) => {
    await api.post(`/internet-control/devices/${deviceId}/resume`);
  },
  // Guest control (NEW)
  suspendAllGuest: async (guestId: number, reason?: string) => {
    const response = await api.post(`/internet-control/guests/${guestId}/suspend-all`, { reason });
    return response.data;
  },
  resumeAllGuest: async (guestId: number) => {
    const response = await api.post(`/internet-control/guests/${guestId}/resume-all`);
    return response.data;
  },
  // Status (NEW)
  getStatus: async () => {
    const response = await api.get<InternetStatus>('/internet-control/status');
    return response.data;
  },
};

// Health API (NEW)
export const healthApi = {
  liveness: async () => {
    const response = await api.get<HealthCheck>('/healthz');
    return response.data;
  },
  readiness: async () => {
    const response = await api.get<HealthCheck>('/readyz');
    return response.data;
  },
};

// Metrics API (NEW)
export const metricsApi = {
  get: async () => {
    // Note: metrics endpoint is not under /api/v1
    const response = await api.get('/metrics', {
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    });
    return response.data;
  },
};
