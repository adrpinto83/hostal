#!/bin/bash

# Script para iniciar el backend del sistema de hostal

echo "🚀 Iniciando Backend del Sistema de Hostal..."
echo ""

# Navegar al directorio backend
cd "$(dirname "$0")/backend"

# Verificar si existe el entorno virtual
if [ ! -d "venv" ]; then
    echo "⚠️  No se encontró entorno virtual. Creando..."
    python3 -m venv venv
    echo "✓ Entorno virtual creado"
fi

# Activar entorno virtual
echo "📦 Activando entorno virtual..."
source venv/bin/activate

# Instalar/actualizar dependencias
echo "📥 Instalando dependencias..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1
echo "✓ Dependencias instaladas"

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo "⚙️  Creando archivo .env..."
    cp .env.example .env
    echo "✓ Archivo .env creado"
fi

# Verificar si existe la base de datos
if [ ! -f "hostal.db" ]; then
    echo "🗄️  Base de datos no encontrada. Ejecutando migraciones..."
    alembic upgrade head
    echo "✓ Base de datos creada"
    
    # Crear usuario admin
    echo "👤 Creando usuario administrador..."
    python << 'EOF'
from app.core.db import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email="admin@hostal.com",
    hashed_password=get_password_hash("admin123"),
    role="admin",
    approved=True
)
db.add(admin)
db.commit()
db.close()
print("✓ Usuario admin creado")
print("  Email: admin@hostal.com")
print("  Contraseña: admin123")
EOF
fi

echo ""
echo "✅ Backend configurado correctamente"
echo ""
echo "🌐 Iniciando servidor en http://localhost:8000"
echo "📚 Documentación API: http://localhost:8000/docs"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""

# Iniciar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
