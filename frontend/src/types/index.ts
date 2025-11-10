// API Types
export interface User {
  id: number;
  email: string;
  role: string;
}

export interface Guest {
  id: number;
  full_name: string;
  document_id: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface Room {
  id: number;
  number: string;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_service';
  notes?: string;
}

export interface Staff {
  id: number;
  full_name: string;
  document_id: string;
  phone?: string;
  email?: string;
  role: string;
  status: string;
  hire_date?: string;
  salary?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Occupancy {
  id: number;
  room_id: number;
  guest_id: number;
  reservation_id?: number;
  check_in: string;
  check_out?: string;
  amount_paid_bs?: number;
  amount_paid_usd?: number;
  payment_method?: string;
  notes?: string;
  room_number?: string;
  guest_name?: string;
  is_active: boolean;
  duration_hours?: number;
}

export interface Maintenance {
  id: number;
  room_id: number;
  type: string;
  priority: string;
  status: string;
  title: string;
  description?: string;
  notes?: string;
  assigned_to?: number;
  reported_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_cost?: number;
  actual_cost?: number;
  room_number?: string;
  assigned_staff_name?: string;
  duration_hours?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface DashboardStats {
  rooms: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
    out_of_service: number;
    cleaning: number;
  };
  occupancy: {
    total_occupancies: number;
    active_occupancies: number;
    occupied_rooms: number;
    revenue: {
      total_bs: number;
      total_usd: number;
    };
  };
  maintenance: {
    total: number;
    pending: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    costs: {
      total_estimated: number;
      total_actual: number;
    };
  };
  staff: {
    total: number;
    active: number;
    by_status: Record<string, number>;
    by_role: Record<string, number>;
  };
}
