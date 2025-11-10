# Frontend - Sistema de Gestión de Hostal

Frontend moderno desarrollado con React + TypeScript + Vite para el sistema de gestión integral del hostal.

## 🛠 Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navegación
- **TanStack Query** - Gestión de estado del servidor
- **Axios** - Cliente HTTP
- **Tailwind CSS** - Estilos
- **Lucide React** - Iconos

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará disponible en http://localhost:3000

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ui/              # Componentes UI base
│   ├── layout/          # Layout y navegación
│   └── common/          # Componentes comunes
├── pages/               # Páginas de la aplicación
│   ├── auth/            # Login
│   ├── dashboard/       # Dashboard principal
│   ├── staff/           # Gestión de personal
│   ├── occupancy/       # Check-in/Check-out
│   ├── maintenance/     # Mantenimiento
│   ├── guests/          # Huéspedes
│   ├── rooms/           # Habitaciones
│   └── reservations/    # Reservas
├── lib/                 # Utilidades
│   ├── api/             # Cliente API
│   ├── hooks/           # Custom hooks
│   └── utils.ts         # Funciones utilitarias
├── types/               # TypeScript types
├── App.tsx              # Componente principal
└── main.tsx             # Entry point
```

## 🔑 Características Implementadas

### Autenticación
- Login con JWT
- Protección de rutas
- Gestión de sesión

### Dashboard
- Estadísticas en tiempo real
- Habitaciones disponibles/ocupadas
- Ocupación activa
- Personal activo
- Mantenimiento pendiente
- Ingresos por ocupación (VES/USD)

### Gestión de Personal (Staff)
- Listado de empleados
- Filtros por rol y estado
- Información completa de cada empleado

### Ocupación
- Check-in/Check-out
- Listado de ocupaciones activas
- Historial completo
- Pagos multimoneda

### Mantenimiento
- Tareas de mantenimiento
- Prioridades (low, medium, high, critical)
- Estados (pending, in_progress, completed, cancelled)
- Asignación de personal
- Costos estimados/reales

## 🎨 Componentes UI

- Button
- Card
- Input
- Label
- Badge
- Sidebar
- Header
- Layout

## 🌐 API Integration

El frontend se conecta al backend FastAPI a través de:
- Cliente Axios configurado
- Interceptores para autenticación
- Manejo centralizado de errores
- Types compartidos con el backend

## 📝 Próximas Mejoras

- [ ] Formularios de creación/edición
- [ ] Búsqueda y filtros avanzados
- [ ] Paginación
- [ ] Módulo de pagos completo
- [ ] Gestión de dispositivos
- [ ] Reportes y exportación
- [ ] Modo oscuro
- [ ] Notificaciones en tiempo real

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Lint
npm run lint
```

## 📦 Variables de Entorno

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 🤝 Integración con Backend

El frontend está diseñado para integrarse completamente con el backend FastAPI:

- **Auth**: `/api/v1/auth/login`, `/api/v1/auth/me`
- **Staff**: `/api/v1/staff/*`
- **Occupancy**: `/api/v1/occupancy/*`
- **Maintenance**: `/api/v1/maintenance/*`
- **Rooms**: `/api/v1/rooms/*`
- **Guests**: `/api/v1/guests/*`
- **Reservations**: `/api/v1/reservations/*`

## 🎯 Funcionalidades Clave

1. **Sistema de autenticación JWT**
2. **Dashboard con estadísticas en tiempo real**
3. **Gestión completa de personal**
4. **Sistema de check-in/check-out**
5. **Gestión de mantenimiento con prioridades**
6. **Interfaz responsive y moderna**
7. **Type-safe con TypeScript**
8. **Gestión optimizada de estado con React Query**

---

Desarrollado con ⚛️ React + TypeScript + Vite
