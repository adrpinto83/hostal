// API Types
export interface User {
  id: number;
  email: string;
  role: string;
  approved?: boolean;
  full_name?: string;
  profile_picture?: string;
  auth_provider?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Guest {
  id: number;
  full_name: string;
  document_id: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GuestCreate {
  full_name: string;
  document_id: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface GuestUpdate {
  full_name?: string;
  document_id?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface Device {
  id: number;
  guest_id: number;
  guest_name?: string;
  mac: string;
  name?: string;
  vendor?: string;
  allowed: boolean;
  suspended: boolean;
  daily_quota_mb?: number;
  monthly_quota_mb?: number;
  first_seen?: string;
  last_seen?: string;
  last_ip?: string;
  total_bytes_downloaded?: number;
  total_bytes_uploaded?: number;
  is_online?: boolean;
  can_access_internet?: boolean;
}

export interface DeviceCreate {
  mac: string;
  name?: string;
  vendor?: string;
  daily_quota_mb?: number;
  monthly_quota_mb?: number;
}

export interface Room {
  id: number;
  number: string;
  type?: 'single' | 'double' | 'suite';
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_service';
  price_bs?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RoomCreate {
  number: string;
  type?: 'single' | 'double' | 'suite';
  price_bs?: number;
  notes?: string;
}

export interface RoomUpdate {
  number?: string;
  type?: 'single' | 'double' | 'suite';
  status?: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_service';
  price_bs?: number;
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
  user_id?: number | null;
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
  room_id?: number | null;
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
  location_type?: 'room' | 'common_area';
  location_label?: string;
  area_name?: string;
  area_category?: string;
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

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  new_password: string;
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

// Payment Types
export type Currency = 'EUR' | 'USD' | 'VES';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mobile_payment' | 'zelle' | 'paypal' | 'crypto' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Payment {
  id: number;
  guest_id: number;
  reservation_id?: number;
  occupancy_id?: number;
  amount: number;
  currency: Currency;
  amount_eur?: number;
  amount_usd?: number;
  amount_ves?: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference_number?: string;
  notes?: string;
  payment_date: string;
  created_at: string;
}

export interface PaymentCreate {
  guest_id: number;
  reservation_id?: number;
  occupancy_id?: number;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

export interface PaymentUpdate {
  status?: PaymentStatus;
  reference_number?: string;
  notes?: string;
}

export interface PaymentStats {
  period_days: number;
  total_payments: number;
  total_usd: number;
  by_currency: Array<{
    currency: string;
    total: number;
    count: number;
  }>;
  by_method: Array<{
    method: string;
    count: number;
    total_usd: number;
  }>;
  by_status: Array<{
    status: string;
    count: number;
  }>;
}

export interface PaymentsByDate {
  start_date: string;
  end_date: string;
  currency_filter?: string;
  daily_totals: Array<{
    date: string;
    count: number;
    total_usd: number;
    total_original: number;
  }>;
}

export interface GuestPaymentReport {
  guest_id: number;
  guest_name: string;
  total_payments: number;
  completed_payments: number;
  totals: {
    usd: number;
    eur: number;
    ves: number;
  };
  reservation_summary?: {
    count: number;
    total_bs: number;
    total_usd: number;
    total_eur: number;
    reservations: Array<{
      id: number;
      room_number?: string | null;
      status: string;
      period: string;
      start_date: string;
      end_date: string;
      price_bs: number;
    }>;
  };
  balance?: {
    ves: number;
    usd: number;
    eur: number;
  };
  payments: Array<{
    id: number;
    amount: number;
    currency: string;
    method: string;
    status: string;
    payment_date: string;
    reference_number?: string;
  }>;
}

// Bandwidth Types
export interface BandwidthSummary {
  period_days: number;
  total_usage: {
    bytes: number;
    mb: number;
    gb: number;
    downloaded_gb: number;
    uploaded_gb: number;
  };
  recent_usage: {
    downloaded_gb: number;
    uploaded_gb: number;
    total_gb: number;
  };
  top_devices: Array<{
    device_id: number;
    mac: string;
    name?: string;
    guest_id: number;
    usage_gb: number;
  }>;
}

export interface DeviceBandwidth {
  device_id: number;
  mac: string;
  name?: string;
  guest_id: number;
  period_days: number;
  total_usage: {
    downloaded_gb: number;
    uploaded_gb: number;
    total_gb: number;
  };
  activities: Array<{
    timestamp: string;
    type: string;
    downloaded_mb: number;
    uploaded_mb: number;
    ip_address?: string;
    notes?: string;
  }>;
}

export interface GuestBandwidth {
  guest_id: number;
  guest_name: string;
  total_devices: number;
  total_usage: {
    downloaded_gb: number;
    uploaded_gb: number;
    total_gb: number;
  };
  devices: Array<{
    device_id: number;
    mac: string;
    name?: string;
    is_online: boolean;
    suspended: boolean;
    usage_gb: number;
  }>;
}

// Media Types
export type MediaType = 'image' | 'document';
export type MediaCategory = 'room_photo' | 'guest_photo' | 'staff_photo' | 'guest_id' | 'payment_proof' | 'other';

export interface Media {
  id: number;
  filename: string;
  stored_filename: string;
  file_path: string;
  url: string;
  file_size: number;
  file_size_mb: number;
  mime_type: string;
  file_hash?: string;
  media_type: MediaType;
  category: MediaCategory;
  guest_id?: number;
  staff_id?: number;
  room_id?: number;
  title?: string;
  description?: string;
  uploaded_by: number;
  uploaded_at: string;
  is_primary?: boolean;
}

export interface MediaUpload {
  file: File;
  category: MediaCategory;
  guest_id?: number;
  room_id?: number;
  title?: string;
  description?: string;
}

export interface MediaStats {
  total_files: number;
  total_size_mb: number;
  by_type: Array<{
    type: string;
    count: number;
    size_mb: number;
  }>;
  by_category: Array<{
    category: string;
    count: number;
  }>;
}

// User Management Types
export interface UserCreate {
  email: string;
  password: string;
  role: 'admin' | 'gerente' | 'recepcionista' | 'mantenimiento';
  full_name?: string;
}

export interface UserUpdate {
  email?: string;
  password?: string;
  role?: 'admin' | 'gerente' | 'recepcionista' | 'mantenimiento';
  full_name?: string;
}

// Reservation Types
export type ReservationStatus = 'pending' | 'active' | 'checked_out' | 'cancelled';
export type Period = "day" | "week" | "fortnight" | "month";

export interface Reservation {
  id: number;
  guest_id: number;
  room_id: number;
  start_date: string;
  end_date: string;
  period: Period;
  periods_count: number;
  price_bs: number;
  status: ReservationStatus;
  notes?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  guest: Guest;
  room: Room;
}

export interface ReservationCreate {
  guest_id: number;
  room_id: number;
  start_date: string;
  period: Period;
  periods_count: number;
  price_bs?: number;
  notes?: string;
}

export interface ReservationUpdate {
  start_date?: string;
  status?: ReservationStatus;
  notes?: string;
}

// Room Rates Types
export interface RoomRate {
  id: number;
  room_id: number;
  rate_type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  price: number;
  currency: Currency;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
  created_at: string;
}

export interface RoomRateCreate {
  rate_type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  price: number;
  currency: Currency;
  valid_from?: string;
  valid_until?: string;
  notes?: string;
}

// Exchange Rates Types
export interface ExchangeRate {
  id: number;
  base_currency: string;
  target_currency: string;
  rate: number;
  source: string;
  fetched_at: string;
}

export interface ExchangeRatesResponse {
  base_currency: string;
  rates: Record<string, number>;
  last_updated: string;
}

export interface ConversionResult {
  from_currency: string;
  to_currency: string;
  amount: number;
  converted_amount: number;
  rate: number;
  timestamp: string;
}

export interface MultiConversionResult {
  from_currency: string;
  amount: number;
  conversions: Record<string, number>;
  rates: Record<string, number>;
  timestamp: string;
}

// Staff Types (Extended)
export interface StaffCreate {
  full_name: string;
  document_id: string;
  phone?: string;
  email?: string;
  role: 'gerente' | 'recepcionista' | 'mantenimiento' | 'limpieza';
  status?: 'active' | 'inactive' | 'on_leave';
  hire_date?: string;
  salary?: number;
  notes?: string;
}

export interface StaffUpdate {
  full_name?: string;
  document_id?: string;
  phone?: string;
  email?: string;
  role?: 'gerente' | 'recepcionista' | 'mantenimiento' | 'limpieza';
  status?: 'active' | 'inactive' | 'on_leave';
  salary?: number;
  notes?: string;
}

// Occupancy Types (Extended)
export interface OccupancyCreate {
  room_id: number;
  guest_id: number;
  reservation_id?: number;
  amount_paid_bs?: number;
  amount_paid_usd?: number;
  payment_method?: string;
  notes?: string;
}

export interface OccupancyCheckOut {
  amount_paid_bs?: number;
  amount_paid_usd?: number;
  payment_method?: string;
  notes?: string;
}

// Maintenance Types (Extended)
export interface MaintenanceCreate {
  room_id?: number;
  type: 'repair' | 'cleaning' | 'inspection' | 'upgrade' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description?: string;
  estimated_cost?: number;
  assigned_to?: number;
  notes?: string;
  location_type?: 'room' | 'common_area';
  location_label?: string;
  area_category?: string;
  area_name?: string;
}

export interface MaintenanceUpdate {
  room_id?: number;
  type?: 'repair' | 'cleaning' | 'inspection' | 'upgrade' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  title?: string;
  description?: string;
  estimated_cost?: number;
  actual_cost?: number;
  assigned_to?: number;
  notes?: string;
  location_type?: 'room' | 'common_area';
  location_label?: string;
  area_category?: string;
  area_name?: string;
}

// Internet Control Types (Extended)
export interface InternetStatus {
  total_devices: number;
  online_devices: number;
  suspended_devices: number;
  active_guests: number;
  bandwidth_usage_gb: number;
}

export interface NetworkActivity {
  id: number;
  device_id: number;
  activity_type: string;
  timestamp: string;
  downloaded_mb: number;
  uploaded_mb: number;
  ip_address?: string;
  notes?: string;
  device?: {
    mac: string;
    name?: string;
    guest_id: number;
  };
}

// Network Device Types
export type DeviceBrand = 'ubiquiti' | 'mikrotik' | 'cisco' | 'tp_link' | 'asus' | 'dlink' | 'netgear' | 'aruba' | 'fortinet' | 'other';
export type DeviceType = 'switch' | 'router' | 'access_point' | 'firewall' | 'controller' | 'modem';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'testing';
export type AuthType = 'username_password' | 'api_key' | 'token' | 'certificate' | 'ssh_key';

export interface NetworkDevice {
  id: number;
  name: string;
  description?: string;
  brand: DeviceBrand;
  device_type: DeviceType;
  ip_address: string;
  mac_address?: string;
  network_interface?: string;
  is_active: boolean;
  connection_status: ConnectionStatus;
  is_connected: boolean;
  auth_type: AuthType;
  port: number;
  use_ssl: boolean;
  verify_ssl: boolean;
  timeout_seconds: number;
  last_connection_attempt?: string;
  last_successful_connection?: string;
  last_error_message?: string;
  total_operations: number;
  failed_operations: number;
  success_rate: number;
  health_percentage: number;
  supports_mac_blocking: boolean;
  supports_bandwidth_control: boolean;
  supports_vlan: boolean;
  supports_firewall_rules: boolean;
  supports_traffic_shaping: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetworkDeviceCreate {
  name: string;
  description?: string;
  brand: DeviceBrand;
  device_type: DeviceType;
  ip_address: string;
  mac_address?: string;
  network_interface?: string;
  auth_type: AuthType;
  username?: string;
  password?: string;
  api_key?: string;
  api_secret?: string;
  certificate_path?: string;
  port?: number;
  use_ssl?: boolean;
  verify_ssl?: boolean;
  timeout_seconds?: number;
  supports_mac_blocking?: boolean;
  supports_bandwidth_control?: boolean;
  supports_vlan?: boolean;
  supports_firewall_rules?: boolean;
  supports_traffic_shaping?: boolean;
  vendor_config?: string;
}

export interface NetworkDeviceUpdate {
  name?: string;
  description?: string;
  ip_address?: string;
  mac_address?: string;
  network_interface?: string;
  username?: string;
  password?: string;
  api_key?: string;
  api_secret?: string;
  certificate_path?: string;
  port?: number;
  use_ssl?: boolean;
  verify_ssl?: boolean;
  timeout_seconds?: number;
  supports_mac_blocking?: boolean;
  supports_bandwidth_control?: boolean;
  supports_vlan?: boolean;
  supports_firewall_rules?: boolean;
  supports_traffic_shaping?: boolean;
  is_active?: boolean;
  vendor_config?: string;
}

export interface NetworkDeviceTestConnection {
  device_id: number;
  is_connected: boolean;
  status: ConnectionStatus;
  message: string;
  timestamp: string;
  response_time_ms?: number;
}

// Usage Ticket Types
export type TicketType = 'block' | 'unblock' | 'suspension' | 'quota_exceeded' | 'bandwidth_limit' | 'device_registration' | 'network_incident' | 'manual_intervention' | 'automatic_action' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'pending' | 'cancelled';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type ActionStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'partial';

export interface UsageTicket {
  id: number;
  ticket_number: string;
  title: string;
  description?: string;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  mac_address?: string;
  device_name?: string;
  guest_id?: number;
  device_id?: number;
  network_device_id?: number;
  action_type: string;
  action_status: ActionStatus;
  affected_devices_count: number;
  bandwidth_limit_mbps?: number;
  quota_limit_gb?: number;
  duration_minutes?: number;
  is_temporary: boolean;
  created_by?: number;
  assigned_to?: number;
  resolved_by?: number;
  created_at: string;
  updated_at: string;
  scheduled_action_time?: string;
  action_executed_at?: string;
  resolved_at?: string;
  reason?: string;
  resolution_notes?: string;
  error_message?: string;
  metadata_json?: Record<string, unknown>;
  is_active: boolean;
  is_actionable: boolean;
  days_open: number;
  time_until_execution?: number;
}

export interface UsageTicketCreate {
  title: string;
  description?: string;
  ticket_type: TicketType;
  priority?: TicketPriority;
  mac_address?: string;
  device_name?: string;
  guest_id?: number;
  device_id?: number;
  network_device_id?: number;
  action_type: string;
  affected_devices_count?: number;
  bandwidth_limit_mbps?: number;
  quota_limit_gb?: number;
  duration_minutes?: number;
  is_temporary?: boolean;
  scheduled_action_time?: string;
  reason?: string;
}

export interface UsageTicketUpdate {
  title?: string;
  description?: string;
  reason?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  action_type?: string;
  bandwidth_limit_mbps?: number;
  quota_limit_gb?: number;
  duration_minutes?: number;
  assigned_to?: number;
  resolution_notes?: string;
}

export interface UsageTicketResolve {
  status: TicketStatus;
  resolution_notes: string;
}

// Health Check Types
export interface HealthCheck {
  status: string;
  timestamp: string;
  details?: Record<string, unknown>;
}
