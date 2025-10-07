// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import RequireAuth from './router/RequireAuth'; // Crearemos este archivo ahora

function App() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        {/* Redirige a login si la ruta es la raíz */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </div>
  );
}

export default App;
