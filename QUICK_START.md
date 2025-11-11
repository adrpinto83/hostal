# ⚡ Inicio Rápido - Sistema de Hostal

## 📍 Ubicación de Archivos

Todos los scripts están en: `/home/user/hostal/`

```
/home/user/hostal/
├── setup.sh              ← Configuración inicial completa
├── start_backend.sh      ← Inicia el backend
├── start_frontend.sh     ← Inicia el frontend
├── create_test_data.sh   ← Crea datos de prueba
├── START_LOCAL.md        ← Guía detallada paso a paso
├── README_TESTING.md     ← Guía de pruebas completa
└── DEPLOYMENT_GUIDE.md   ← Guía de producción
```

## 🚀 Usar los Scripts

### Paso 1: Ir al directorio del proyecto
```bash
cd /home/user/hostal
```

### Paso 2: Ver los scripts disponibles
```bash
ls -la *.sh
```

Deberías ver:
```
-rwxr-xr-x create_test_data.sh
-rwxr-xr-x setup.sh
-rwxr-xr-x start_backend.sh
-rwxr-xr-x start_frontend.sh
```

### Paso 3: Ejecutar configuración inicial
```bash
./setup.sh
```

### Paso 4: Crear datos de prueba (opcional)
```bash
./create_test_data.sh
```

### Paso 5: Iniciar backend (en esta terminal)
```bash
./start_backend.sh
```

### Paso 6: Iniciar frontend (en OTRA terminal)
```bash
# Abrir nueva terminal
cd /home/user/hostal
./start_frontend.sh
```

## 🌐 Acceder al Sistema

1. Abrir navegador: http://localhost:3000
2. Login:
   - Email: `admin@hostal.com`
   - Password: `admin123`

## ❓ Si no ves los archivos

```bash
# Asegúrate de estar en el directorio correcto
pwd
# Debe mostrar: /home/user/hostal

# Si no estás ahí, navega al directorio
cd /home/user/hostal

# Ahora lista los archivos
ls -la *.sh
```

## 🔧 Alternativa Manual (si prefieres)

### Backend:
```bash
cd /home/user/hostal/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend (en otra terminal):
```bash
cd /home/user/hostal/frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
npm run dev
```

## 📊 Verificación Rápida

```bash
# Backend funcionando
curl http://localhost:8000/api/v1/health

# Frontend funcionando
# Abrir http://localhost:3000 en navegador
```

---

**¿Problemas?** Consulta README_TESTING.md para solución de problemas.
