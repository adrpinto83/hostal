// API Types matching backend models

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

export interface RoomRate {
  id: number;
  room_id: number;
  currency: 'EUR' | 'USD' | 'VES';
  rate: number;
  valid_from: string;
  valid_to?: string;
  currency_note?: string;
}

export interface Reservation {
  id: number;
  guest_id: number;
  room_id: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price?: number;
  notes?: string;
}

export enum StaffRole {
  RECEPCIONISTA = 'recepcionista',
  LIMPIEZA = 'limpieza',
  MANTENIMIENTO = 'mantenimiento',
  GERENTE = 'gerente',
  SEGURIDAD = 'seguridad',
}

export enum StaffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated',
}

export interface Staff {
  id: number;
  full_name: string;
  document_id: string;
  phone?: string;
  email?: string;
  role: StaffRole;
  status: StaffStatus;
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

export enum MaintenanceType {
  PLOMERIA = 'plomeria',
  ELECTRICIDAD = 'electricidad',
  PINTURA = 'pintura',
  LIMPIEZA_PROFUNDA = 'limpieza_profunda',
  REPARACION_MUEBLES = 'reparacion_muebles',
  AIRE_ACONDICIONADO = 'aire_acondicionado',
  CERRAJERIA = 'cerrajeria',
  ELECTRODOMESTICOS = 'electrodomesticos',
  OTRO = 'otro',
}

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MaintenanceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Maintenance {
  id: number;
  room_id: number;
  type: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
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

export interface Payment {
  id: number;
  guest_id: number;
  reservation_id?: number;
  occupancy_id?: number;
  amount: number;
  currency: 'EUR' | 'USD' | 'VES';
  amount_eur?: number;
  amount_usd?: number;
  amount_ves?: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'mobile_payment' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  notes?: string;
  payment_date: string;
  created_at: string;
}

export interface Device {
  id: number;
  guest_id: number;
  mac: string;
  name?: string;
  vendor?: string;
  allowed: boolean;
  suspended: boolean;
  suspension_reason?: string;
  daily_quota_mb?: number;
  monthly_quota_mb?: number;
}

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  source?: string;
  effective_date: string;
}

// Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface StaffCreate {
  full_name: string;
  document_id: string;
  phone?: string;
  email?: string;
  role: StaffRole;
  status?: StaffStatus;
  hire_date?: string;
  salary?: number;
  notes?: string;
}

export interface StaffUpdate {
  full_name?: string;
  phone?: string;
  email?: string;
  role?: StaffRole;
  status?: StaffStatus;
  salary?: number;
  notes?: string;
}

export interface CheckInRequest {
  room_id: number;
  guest_id: number;
  reservation_id?: number;
  check_in?: string;
  amount_paid_bs?: number;
  amount_paid_usd?: number;
  payment_method?: string;
  notes?: string;
}

export interface CheckOutRequest {
  check_out?: string;
  amount_paid_bs?: number;
  amount_paid_usd?: number;
  payment_method?: string;
  notes?: string;
}

export interface MaintenanceCreate {
  room_id: number;
  type: MaintenanceType;
  priority: MaintenancePriority;
  title: string;
  description?: string;
  assigned_to?: number;
  estimated_cost?: number;
}

export interface MaintenanceUpdate {
  type?: MaintenanceType;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
  title?: string;
  description?: string;
  assigned_to?: number;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
}

// Statistics types
export interface DashboardStats {
  rooms: {
    total: number;
    available: number;
    occupied: number;
    maintenance: number;
    out_of_service: number;
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
