import { api } from './client';
import type {
  Guest,
  Room,
  Reservation,
  Staff,
  StaffCreate,
  StaffUpdate,
  Occupancy,
  CheckInRequest,
  CheckOutRequest,
  Maintenance,
  MaintenanceCreate,
  MaintenanceUpdate,
  Device,
  DashboardStats,
} from '@/types';

// Guests API
export const guestsApi = {
  getAll: async (params?: { search?: string; skip?: number; limit?: number }) => {
    const response = await api.get<Guest[]>('/guests', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Guest>(`/guests/${id}`);
    return response.data;
  },
  create: async (data: Omit<Guest, 'id'>) => {
    const response = await api.post<Guest>('/guests', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Guest>) => {
    const response = await api.patch<Guest>(`/guests/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/guests/${id}`);
  },
};

// Rooms API
export const roomsApi = {
  getAll: async (params?: { status?: string }) => {
    const response = await api.get<Room[]>('/rooms', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Room>(`/rooms/${id}`);
    return response.data;
  },
  create: async (data: Omit<Room, 'id'>) => {
    const response = await api.post<Room>('/rooms', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Room>) => {
    const response = await api.patch<Room>(`/rooms/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/rooms/${id}`);
  },
};

// Reservations API
export const reservationsApi = {
  getAll: async (params?: { guest_id?: number; room_id?: number; status?: string }) => {
    const response = await api.get<Reservation[]>('/reservations', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Reservation>(`/reservations/${id}`);
    return response.data;
  },
  create: async (data: Omit<Reservation, 'id'>) => {
    const response = await api.post<Reservation>('/reservations', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Reservation>) => {
    const response = await api.patch<Reservation>(`/reservations/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/reservations/${id}`);
  },
};

// Staff API
export const staffApi = {
  getAll: async (params?: { role?: string; status?: string; search?: string }) => {
    const response = await api.get<Staff[]>('/staff', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Staff>(`/staff/${id}`);
    return response.data;
  },
  create: async (data: StaffCreate) => {
    const response = await api.post<Staff>('/staff', data);
    return response.data;
  },
  update: async (id: number, data: StaffUpdate) => {
    const response = await api.patch<Staff>(`/staff/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/staff/${id}`);
  },
  getStats: async () => {
    const response = await api.get('/staff/stats/summary');
    return response.data;
  },
  changeStatus: async (id: number, newStatus: string, notes?: string) => {
    const response = await api.post<Staff>(`/staff/${id}/change-status`, null, {
      params: { new_status: newStatus, notes },
    });
    return response.data;
  },
};

// Occupancy API
export const occupancyApi = {
  getAll: async (params?: { room_id?: number; guest_id?: number; active_only?: boolean }) => {
    const response = await api.get<Occupancy[]>('/occupancy', { params });
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
  checkIn: async (data: CheckInRequest) => {
    const response = await api.post<Occupancy>('/occupancy/check-in', data);
    return response.data;
  },
  checkOut: async (id: number, data: CheckOutRequest) => {
    const response = await api.post<Occupancy>(`/occupancy/${id}/check-out`, data);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/occupancy/stats/summary');
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/occupancy/${id}`);
  },
};

// Maintenance API
export const maintenanceApi = {
  getAll: async (params?: {
    room_id?: number;
    type?: string;
    priority?: string;
    status?: string;
    assigned_to?: number;
    pending_only?: boolean;
  }) => {
    const response = await api.get<Maintenance[]>('/maintenance', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Maintenance>(`/maintenance/${id}`);
    return response.data;
  },
  create: async (data: MaintenanceCreate) => {
    const response = await api.post<Maintenance>('/maintenance', data);
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
  complete: async (id: number, actualCost?: number, notes?: string) => {
    const response = await api.post<Maintenance>(`/maintenance/${id}/complete`, null, {
      params: { actual_cost: actualCost, notes },
    });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/maintenance/stats/summary');
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/maintenance/${id}`);
  },
};

// Devices API
export const devicesApi = {
  getAll: async (params?: { guest_id?: number }) => {
    const response = await api.get<Device[]>('/devices', { params });
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<Device>(`/devices/${id}`);
    return response.data;
  },
  create: async (data: Omit<Device, 'id'>) => {
    const response = await api.post<Device>('/devices', data);
    return response.data;
  },
  update: async (id: number, data: Partial<Device>) => {
    const response = await api.patch<Device>(`/devices/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/devices/${id}`);
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    // Fetch all stats in parallel
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
