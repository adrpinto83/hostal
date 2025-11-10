import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import StaffList from './pages/staff/StaffList';
import OccupancyList from './pages/occupancy/OccupancyList';
import MaintenanceList from './pages/maintenance/MaintenanceList';

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
            <Route path="staff" element={<StaffList />} />
            <Route path="occupancy" element={<OccupancyList />} />
            <Route path="maintenance" element={<MaintenanceList />} />
            <Route path="guests" element={<div>Página de Huéspedes (Por implementar)</div>} />
            <Route path="rooms" element={<div>Página de Habitaciones (Por implementar)</div>} />
            <Route path="reservations" element={<div>Página de Reservas (Por implementar)</div>} />
            <Route path="payments" element={<div>Página de Pagos (Por implementar)</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
