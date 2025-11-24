# Frontend - Sistema de Gestión de Hostal

Aplicación web SPA construida con React + TypeScript para gestión de hostales.

## 🚀 Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite 5** - Build tool ultrarrápido
- **React Router v6** - Navegación
- **TanStack Query v5** - Estado del servidor
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - Estado global
- **Axios** - Cliente HTTP
- **React Hook Form** - Formularios
- **Sonner** - Notificaciones
- **Lucide React** - Iconos

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con la URL del backend

# Iniciar servidor de desarrollo
npm run dev

# O con puerto específico
npm run dev -- --port 3000
```

## ⚙️ Configuración

### Variables de Entorno

```bash
# .env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Sistema Hostal
```

## 🗂️ Estructura

```
frontend/
├── src/
│   ├── components/        # Componentes reutilizables
│   │   ├── ui/           # Componentes base (Button, Card, etc.)
│   │   ├── forms/        # Formularios específicos
│   │   ├── layout/       # Layout components
│   │   └── payments/     # Componentes de pago
│   ├── pages/            # Páginas principales
│   │   ├── auth/         # Login, registro
│   │   ├── dashboard/    # Dashboard principal
│   │   ├── guests/       # Gestión de huéspedes
│   │   ├── rooms/        # Gestión de habitaciones
│   │   ├── payments/     # Gestión de pagos
│   │   ├── invoices/     # Gestión de facturas
│   │   ├── staff/        # Gestión de personal
│   │   └── ...
│   ├── lib/              # Utilidades
│   │   ├── api/          # Cliente API y endpoints
│   │   ├── utils/        # Funciones helper
│   │   └── venezuela-payments.ts  # Configuración de pagos VE
│   ├── hooks/            # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── usePayment.ts
│   │   └── ...
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   ├── App.tsx           # Componente raíz
│   └── main.tsx          # Entry point
├── public/               # Archivos estáticos
└── index.html
```

## 🎨 Componentes Principales

### Layout

- **`Sidebar`** - Navegación lateral
- **`Header`** - Cabecera con user menu
- **`Layout`** - Wrapper principal

### Pages

- **Dashboard** - Métricas y estadísticas
- **GuestList** - Listado de huéspedes
- **RoomList** - Listado de habitaciones
- **PaymentList** - Gestión de pagos
- **InvoiceList** - Gestión de facturas
- **StaffList** - Gestión de personal
- **MaintenanceList** - Solicitudes de mantenimiento

### Forms

- **VenezuelanPaymentForm** - Formulario de pago móvil con validación
- **CashPaymentForm** - Formulario de pago en efectivo
- **CheckoutModal** - Modal de checkout multi-método

## 🔌 API Client

### Estructura del Cliente

```typescript
// lib/api/index.ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptores
api.interceptors.request.use(addAuthToken);
api.interceptors.response.use(handleSuccess, handleError);
```

### Uso con React Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { guestsApi } from '@/lib/api';

// Query
const { data, isLoading } = useQuery({
  queryKey: ['guests'],
  queryFn: () => guestsApi.getAll(),
});

// Mutation
const createMutation = useMutation({
  mutationFn: guestsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['guests'] });
  },
});
```

## 🎨 Estilos

### Tailwind CSS

Configuración en `tailwind.config.js`:

```javascript
// Colores personalizados
colors: {
  primary: {...},
  secondary: {...},
}
```

### Componentes UI

Basados en Shadcn/ui:
- Button
- Card
- Input
- Label
- Badge
- Dialog
- Select
- Table

## 🔐 Autenticación

### Store de Auth (Zustand)

```typescript
import { useAuthStore } from '@/stores/authStore';

const { user, login, logout, isAuthenticated } = useAuthStore();
```

### Protected Routes

```typescript
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

## 🧪 Testing

```bash
# Tests unitarios (Vitest)
npm test

# Tests E2E (Cypress - si configurado)
npm run test:e2e

# Coverage
npm run test:coverage
```

## 🔧 Build

```bash
# Build para producción
npm run build

# Preview del build
npm run preview

# Analyze bundle size
npm run build -- --report
```

### Optimizaciones

- Code splitting automático por rutas
- Lazy loading de componentes pesados
- Tree shaking de dependencias no usadas
- Minificación de CSS y JS

## 📱 Responsive Design

Breakpoints de Tailwind:

- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

## 🌐 i18n (Futuro)

Preparado para internacionalización con react-i18next.

## 🚀 Despliegue

### Producción con Nginx

```nginx
server {
    listen 80;
    server_name tudominio.com;
    root /var/www/hostal/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
    }
}
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

## 🐛 Debug

```bash
# Ver variables de entorno
console.log(import.meta.env)

# React DevTools
# Instalar extensión del navegador

# Network requests
# Ver tab Network en DevTools
```

## 📊 Performance

### Métricas Target

- **FCP** (First Contentful Paint): < 1.8s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TTI** (Time to Interactive): < 3.8s
- **CLS** (Cumulative Layout Shift): < 0.1

### Optimizaciones Implementadas

- ✅ Code splitting por rutas
- ✅ Lazy loading de componentes
- ✅ Memoización con useMemo/useCallback
- ✅ React Query cache configurado
- ✅ Imágenes optimizadas
- ✅ Tailwind CSS purge habilitado

## 🎯 Features Destacadas

### Sistema de Pagos

- **Pago Móvil Venezolano**
  - Validación en tiempo real
  - 30 bancos integrados
  - 8 operadores móviles
  - Validación de teléfono/cédula

- **Efectivo**
  - Código de billete obligatorio (USD/EUR)
  - Referencia opcional (VES)

### Dashboard

- Métricas en tiempo real
- Gráficos interactivos
- Filtros avanzados
- Exportación de datos

### Gestión de Huéspedes

- Perfil completo
- Historial de pagos
- Dispositivos de red
- Fotografías

## 📞 Soporte

Ver [README principal](../README.md) para más información.

## 🔗 Enlaces Útiles

- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Desarrollado por JADS Software - Venezuela**
**Ing. Adrian Pinto** | WhatsApp: [+58 412-4797466](https://wa.me/584124797466)

*© 2025 JADS Software. Todos los derechos reservados.*
