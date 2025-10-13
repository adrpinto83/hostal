// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
import Login from "@/pages/LoginPage";
import Dashboard from "@/pages/DashboardPage";
import Profile from "@/pages/ProfilePage";
import Rooms from "@/pages/RoomsPage";
import ReservationsPage from "@/pages/ReservationsPage";
import GuestsPage from "@/pages/GuestsPage";

export default function App() {
  return (
    <Routes>
      {/* público */}
      <Route path="/login" element={<Login />} />

      {/* privado con layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/guests" element={<GuestsPage />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
