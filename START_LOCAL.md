# 🚀 Guía Rápida - Iniciar Sistema Localmente

## Paso 1: Preparar el Backend

### 1.1 Navegar al directorio backend
```bash
cd /home/user/hostal/backend
```

### 1.2 Crear y activar entorno virtual
```bash
# Crear entorno virtual
python3 -m venv venv

# Activar (Linux/Mac)
source venv/bin/activate

# Activar (Windows)
# venv\Scripts\activate
```

### 1.3 Instalar dependencias
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 1.4 Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# El archivo ya tiene configuración para SQLite (desarrollo)
# No necesitas modificar nada para pruebas locales
```

### 1.5 Crear base de datos con migraciones
```bash
# Aplicar todas las migraciones
alembic upgrade head

# Verificar que se aplicaron correctamente
alembic current
```

### 1.6 Crear usuario administrador
```bash
# Ejecutar script Python
python << 'EOF'
from app.core.db import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()

# Verificar si ya existe el admin
existing = db.query(User).filter(User.email == "admin@hostal.com").first()
if existing:
    print("✓ Usuario admin ya existe")
else:
    admin = User(
        email="admin@hostal.com",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    print("✓ Usuario admin creado exitosamente")
    print("  Email: admin@hostal.com")
    print("  Contraseña: admin123")

db.close()
EOF
```

### 1.7 Iniciar servidor backend
```bash
# Iniciar en modo desarrollo con recarga automática
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**✅ Backend listo en:** http://localhost:8000
- Documentación API: http://localhost:8000/docs
- Health check: http://localhost:8000/api/v1/health

---

## Paso 2: Preparar el Frontend

### 2.1 Abrir una NUEVA terminal y navegar al frontend
```bash
cd /home/user/hostal/frontend
```

### 2.2 Instalar dependencias de Node.js
```bash
npm install
```

### 2.3 Configurar variables de entorno
```bash
# Crear archivo .env
cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:8000
EOF
```

### 2.4 Iniciar servidor frontend
```bash
npm run dev
```

**✅ Frontend listo en:** http://localhost:3000

---

## Paso 3: Probar el Sistema

### 3.1 Acceder a la aplicación
Abre tu navegador en: **http://localhost:3000**

### 3.2 Iniciar sesión
```
Email: admin@hostal.com
Contraseña: admin123
```

### 3.3 Verificar funcionalidades

#### ✅ Dashboard
- Verifica que cargue sin errores
- Deberías ver estadísticas en 0 (sistema nuevo)

#### ✅ Crear datos de prueba

**Personal:**
1. Ir a "Personal" en el menú
2. La lista estará vacía (normal)
3. Usar la API para crear empleados de prueba

**Habitaciones:**
1. Ir a "Habitaciones"
2. La lista estará vacía
3. Usar la API para crear habitaciones

---

## Paso 4: Crear Datos de Prueba (Opcional)

### 4.1 Usando la API directamente

Abre http://localhost:8000/docs y usa la interfaz Swagger:

#### Crear una habitación:
1. Expandir `POST /api/v1/rooms`
2. Click en "Try it out"
3. Usar este JSON:
```json
{
  "number": "101",
  "status": "available",
  "notes": "Habitación de prueba"
}
```
4. Click "Execute"

#### Crear un huésped:
1. Expandir `POST /api/v1/guests`
2. Click en "Try it out"
3. Usar este JSON:
```json
{
  "full_name": "Juan Pérez",
  "document_id": "V-12345678",
  "phone": "+58 412 1234567",
  "email": "juan@example.com",
  "notes": "Cliente frecuente"
}
```

#### Crear personal:
1. Expandir `POST /api/v1/staff`
2. Click en "Try it out"
3. Necesitas autenticarte primero (botón "Authorize" arriba)
4. Usar este JSON:
```json
{
  "full_name": "María González",
  "document_id": "V-98765432",
  "phone": "+58 412 9876543",
  "email": "maria@hostal.com",
  "role": "recepcionista",
  "status": "active",
  "salary": 300
}
```

### 4.2 Verificar en el frontend
Refresca las páginas correspondientes para ver los datos creados.

---

## 🔧 Comandos Útiles

### Backend
```bash
# Ver logs en tiempo real
tail -f logs/app.log

# Resetear base de datos
rm hostal.db
alembic upgrade head

# Ver estado de migraciones
alembic current
alembic history
```

### Frontend
```bash
# Limpiar caché y reinstalar
rm -rf node_modules package-lock.json
npm install

# Build para producción (preview)
npm run build
npm run preview
```

---

## ❌ Solución de Problemas

### Backend no inicia
```bash
# Verificar Python
python3 --version  # Debe ser 3.11+

# Reinstalar dependencias
pip install --upgrade -r requirements.txt

# Verificar puerto 8000 disponible
lsof -i :8000  # Linux/Mac
# netstat -ano | findstr :8000  # Windows
```

### Frontend no inicia
```bash
# Verificar Node
node --version  # Debe ser 18+

# Limpiar e instalar
rm -rf node_modules
npm install

# Verificar puerto 3000 disponible
lsof -i :3000  # Linux/Mac
```

### Error de CORS
1. Verificar que backend esté en puerto 8000
2. Verificar .env del frontend tiene: `VITE_API_BASE_URL=http://localhost:8000`
3. Reiniciar ambos servidores

### Error 401 (No autorizado)
1. Verificar que iniciaste sesión
2. Limpiar localStorage del navegador (F12 > Application > Local Storage > Clear)
3. Iniciar sesión nuevamente

---

## 📊 Puertos Usados

| Servicio | Puerto | URL |
|----------|--------|-----|
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| Frontend | 3000 | http://localhost:3000 |

---

## ✅ Checklist de Verificación

- [ ] Backend iniciado sin errores
- [ ] Frontend iniciado sin errores
- [ ] Puedo acceder a http://localhost:3000
- [ ] Puedo iniciar sesión con admin@hostal.com
- [ ] Dashboard carga correctamente
- [ ] Puedo navegar entre secciones
- [ ] API Docs accesible en http://localhost:8000/docs

---

## 🎯 Próximos Pasos

Una vez que todo funcione localmente:

1. **Crear más datos de prueba** usando la API
2. **Probar todas las funcionalidades**:
   - Crear habitaciones
   - Crear huéspedes
   - Hacer check-in
   - Crear tareas de mantenimiento
   - Registrar personal
3. **Verificar flujos completos**
4. **Preparar para producción** (ver DEPLOYMENT_GUIDE.md)

---

¿Algún problema? Revisa la sección de "Solución de Problemas" o verifica los logs.
