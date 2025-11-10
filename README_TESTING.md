# 🧪 Guía de Pruebas del Sistema de Hostal

## 🚀 Inicio Rápido

### Opción 1: Configuración Automática (Recomendado)

```bash
# 1. Ejecutar script de configuración inicial
./setup.sh

# 2. Crear datos de prueba (opcional)
./create_test_data.sh

# 3. Iniciar backend (en una terminal)
./start_backend.sh

# 4. Iniciar frontend (en otra terminal)
./start_frontend.sh

# 5. Abrir navegador en http://localhost:3000
```

### Opción 2: Configuración Manual

Ver archivo [START_LOCAL.md](START_LOCAL.md) para instrucciones detalladas paso a paso.

---

## 📋 Requisitos Previos

- **Python 3.11+** ([Descargar](https://www.python.org/downloads/))
- **Node.js 18+** ([Descargar](https://nodejs.org/))
- **Git** (para clonar el repositorio)

---

## 🔑 Credenciales de Acceso

```
Email: admin@hostal.com
Contraseña: admin123
```

⚠️ **Importante:** Estas son credenciales de prueba. Cámbialas en producción.

---

## 📊 Datos de Prueba

Después de ejecutar `./create_test_data.sh` tendrás:

### Habitaciones (5)
- 101 - Disponible (con vista al jardín)
- 102 - Disponible (estándar)
- 103 - Disponible (con balcón)
- 201 - En limpieza
- 202 - En mantenimiento

### Huéspedes (3)
- Juan Carlos Pérez (V-12345678)
- María González (V-23456789)
- Pedro Ramírez (V-34567890)

### Personal (3)
- Ana Martínez - Recepcionista
- Carlos López - Mantenimiento
- Luisa Fernández - Limpieza

---

## ✅ Lista de Verificación de Pruebas

### 1. Autenticación
- [ ] Login exitoso con credenciales correctas
- [ ] Rechazo con credenciales incorrectas
- [ ] Sesión persiste al recargar página
- [ ] Logout funciona correctamente

### 2. Dashboard
- [ ] Estadísticas se cargan correctamente
- [ ] Números reflejan datos reales
- [ ] Cards son responsivas
- [ ] No hay errores en consola

### 3. Gestión de Personal
- [ ] Lista de empleados se muestra
- [ ] Filtros funcionan correctamente
- [ ] Badges de estado son visibles
- [ ] Información completa se muestra

### 4. Ocupación
- [ ] Lista de ocupaciones se carga
- [ ] Check-in/Check-out visibles
- [ ] Pagos multimoneda se muestran
- [ ] Estado activo/finalizado correcto

### 5. Mantenimiento
- [ ] Tareas se listan correctamente
- [ ] Prioridades con colores adecuados
- [ ] Estados son claros
- [ ] Información detallada disponible

### 6. Navegación
- [ ] Sidebar funciona en todas las páginas
- [ ] Rutas protegidas (requieren login)
- [ ] Breadcrumbs/navegación clara
- [ ] Responsive en mobile

---

## 🔧 Comandos Útiles

### Backend

```bash
# Ver logs en tiempo real
tail -f backend/logs/app.log

# Verificar estado del servidor
curl http://localhost:8000/api/v1/health

# Resetear base de datos
cd backend
rm hostal.db
alembic upgrade head
python create_admin.py

# Ver migraciones aplicadas
cd backend
source venv/bin/activate
alembic current
```

### Frontend

```bash
# Limpiar caché
cd frontend
rm -rf node_modules package-lock.json .vite
npm install

# Build de producción
npm run build
npm run preview

# Ver errores de TypeScript
npm run build
```

---

## 🐛 Solución de Problemas Comunes

### "Puerto 8000 ya está en uso"
```bash
# Linux/Mac
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "Puerto 3000 ya está en uso"
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error CORS en el navegador
1. Verificar que backend está en puerto 8000
2. Verificar archivo frontend/.env:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```
3. Reiniciar ambos servidores

### "Module not found" en backend
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### "Cannot find module" en frontend
```bash
cd frontend
rm -rf node_modules
npm install
```

### Token expirado (401 Unauthorized)
1. Abrir DevTools (F12)
2. Application > Local Storage > Clear
3. Recargar página
4. Iniciar sesión nuevamente

---

## 📱 Pruebas de Navegadores

Probar en:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (Mac)
- [ ] Edge

---

## 🌐 URLs del Sistema

| Componente | URL | Descripción |
|------------|-----|-------------|
| Frontend | http://localhost:3000 | Interfaz principal |
| Backend API | http://localhost:8000 | API REST |
| API Docs (Swagger) | http://localhost:8000/docs | Documentación interactiva |
| ReDoc | http://localhost:8000/redoc | Documentación alternativa |
| Health Check | http://localhost:8000/api/v1/health | Estado del sistema |

---

## 🧪 Flujos de Prueba Sugeridos

### Flujo 1: Check-in de Huésped
1. Login como admin
2. Ir a "Huéspedes"
3. Verificar lista de huéspedes
4. Ir a "Habitaciones"
5. Verificar habitaciones disponibles
6. Ir a "Ocupación"
7. Realizar check-in usando API (http://localhost:8000/docs)

### Flujo 2: Gestión de Mantenimiento
1. Login como admin
2. Ir a "Mantenimiento"
3. Crear tarea usando API
4. Asignar a personal
5. Verificar en lista
6. Actualizar estado

### Flujo 3: Administración de Personal
1. Login como admin
2. Ir a "Personal"
3. Ver lista completa
4. Filtrar por rol
5. Ver estadísticas

---

## 📊 Pruebas de Rendimiento

### Tiempos de carga esperados (desarrollo)
- Login: < 1s
- Dashboard: < 2s
- Listas (Staff, Occupancy, etc): < 1s
- API responses: < 500ms

### Uso de memoria
- Backend: ~100-200 MB
- Frontend (desarrollo): ~200-300 MB

---

## 📝 Notas Importantes

1. **SQLite para desarrollo**: El sistema usa SQLite por defecto para facilitar pruebas. En producción usar PostgreSQL.

2. **Hot Reload**: Ambos servidores (backend y frontend) tienen recarga automática al modificar archivos.

3. **Logs**: Backend genera logs en `backend/logs/app.log`

4. **Datos persistentes**: La base de datos SQLite se guarda en `backend/hostal.db`

5. **Limpiar datos**: Para empezar de cero, eliminar `backend/hostal.db` y ejecutar migraciones nuevamente.

---

## 🎯 Próximos Pasos

Una vez que todas las pruebas pasen:

1. ✅ Configurar PostgreSQL para producción
2. ✅ Configurar variables de entorno de producción
3. ✅ Setup de servidor (VPS/Cloud)
4. ✅ Configurar HTTPS
5. ✅ Deploy del sistema

Ver [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) para instrucciones de producción.

---

**¿Problemas?** Consulta la sección de solución de problemas o revisa los logs.
