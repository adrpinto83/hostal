import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import StaffList from './pages/staff/StaffList';
import OccupancyList from './pages/occupancy/OccupancyList';
import MaintenanceList from './pages/maintenance/MaintenanceList';
import RoomList from './pages/rooms/RoomList';
import GuestList from './pages/guests/GuestList';
import PaymentList from './pages/payments/PaymentList';
import PaymentReports from './pages/payments/PaymentReports';
import NetworkMonitoring from './pages/network/NetworkMonitoring';
import DeviceList from './pages/devices/DeviceList';
import ReservationList from './pages/reservations/ReservationList';
import UserList from './pages/users/UserList';
import ExchangeRates from './pages/exchange/ExchangeRates';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="rooms" element={<RoomList />} />
            <Route path="guests" element={<GuestList />} />
            <Route path="reservations" element={<ReservationList />} />
            <Route path="payments" element={<PaymentList />} />
            <Route path="payments/reports" element={<PaymentReports />} />
            <Route path="staff" element={<StaffList />} />
            <Route path="occupancy" element={<OccupancyList />} />
            <Route path="maintenance" element={<MaintenanceList />} />
            <Route path="network" element={<NetworkMonitoring />} />
            <Route path="devices" element={<DeviceList />} />
            <Route path="users" element={<UserList />} />
            <Route path="exchange-rates" element={<ExchangeRates />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
