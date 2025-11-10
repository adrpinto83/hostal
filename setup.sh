#!/bin/bash

# Script de configuración inicial completa

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Sistema de Gestión de Hostal - Configuración Inicial    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar requisitos
echo "🔍 Verificando requisitos del sistema..."
echo ""

# Verificar Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo "✓ Python instalado: $PYTHON_VERSION"
else
    echo "❌ Python 3 no encontrado. Por favor instala Python 3.11+"
    exit 1
fi

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js instalado: $NODE_VERSION"
else
    echo "❌ Node.js no encontrado. Por favor instala Node.js 18+"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✓ npm instalado: $NPM_VERSION"
else
    echo "❌ npm no encontrado. Por favor instala npm"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configurar Backend
echo "🔧 Configurando Backend..."
cd backend

# Crear entorno virtual
if [ ! -d "venv" ]; then
    echo "  Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
echo "  Instalando dependencias Python..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

# Crear .env
if [ ! -f ".env" ]; then
    echo "  Creando archivo .env..."
    cp .env.example .env
fi

# Crear base de datos
echo "  Creando base de datos..."
alembic upgrade head > /dev/null 2>&1

# Crear usuario admin
echo "  Creando usuario administrador..."
python << 'EOF'
from app.core.db import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
existing = db.query(User).filter(User.email == "admin@hostal.com").first()
if not existing:
    admin = User(
        email="admin@hostal.com",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
db.close()
EOF

echo "✓ Backend configurado"
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configurar Frontend
echo "🔧 Configurando Frontend..."
cd frontend

# Instalar dependencias
echo "  Instalando dependencias Node.js..."
npm install > /dev/null 2>&1

# Crear .env
if [ ! -f ".env" ]; then
    echo "  Creando archivo .env..."
    cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:8000
EOF
fi

echo "✓ Frontend configurado"
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ ¡Configuración completada exitosamente!"
echo ""
echo "📝 Credenciales de acceso:"
echo "   Email: admin@hostal.com"
echo "   Contraseña: admin123"
echo ""
echo "🚀 Para iniciar el sistema:"
echo ""
echo "   Opción 1 - Scripts automatizados:"
echo "   $ ./start_backend.sh    # En una terminal"
echo "   $ ./start_frontend.sh   # En otra terminal"
echo ""
echo "   Opción 2 - Manual:"
echo "   Backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 URLs del sistema:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
