// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import RoomsPage from './pages/Rooms'; // <-- 1. Importa la nueva página
import RequireAuth from './router/RequireAuth';

function App() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas */}
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/rooms" element={<RequireAuth><RoomsPage /></RequireAuth>} /> {/* <-- 2. Añade la nueva ruta protegida */}

        {/* Redirige cualquier otra ruta a la página de login por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
