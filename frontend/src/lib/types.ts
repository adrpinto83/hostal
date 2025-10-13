// src/lib/types.ts
export type Role = "admin" | "recepcionista";
export type Period = "day" | "week" | "fortnight" | "month";
export type ReservationStatus = "pending" | "active" | "checked_out" | "cancelled";

export interface UserMe { id: number; email: string; role: Role; }

export interface Room { id: number; name: string; capacity?: number; notes?: string | null; }
export interface Guest { id: number; full_name: string; document_id?: string | null; phone?: string | null; }
export interface RoomRate { id: number; room_id: number; period: Period; price_bs: number; }

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
  notes?: string | null;
}
export interface ReservationCreate {
  guest_id: number; room_id: number; start_date: string;
  period: Period; periods_count: number; price_bs?: number; notes?: string | null;
}
