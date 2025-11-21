#!/bin/bash

# Script para iniciar el proyecto completo en modo desarrollo
# Backend: FastAPI en puerto 8000
# Frontend: Vite en puerto 3000

set -e

echo "🏨 Iniciando Sistema de Gestión de Hostal..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar si estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: Debe ejecutar este script desde el directorio raíz del proyecto${NC}"
    exit 1
fi

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}Deteniendo servicios...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Verificar dependencias del backend
echo -e "${GREEN}[Backend]${NC} Verificando dependencias..."
if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}Creando entorno virtual de Python...${NC}"
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
else
    echo -e "${GREEN}✓${NC} Entorno virtual encontrado"
fi

# Verificar dependencias del frontend
echo -e "${GREEN}[Frontend]${NC} Verificando dependencias..."
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias de npm...${NC}"
    cd frontend
    npm install
    cd ..
else
    echo -e "${GREEN}✓${NC} node_modules encontrado"
fi

# Verificar PostgreSQL
echo ""
echo -e "${GREEN}[Database]${NC} Verificando conexión a PostgreSQL..."
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo -e "${RED}⚠ PostgreSQL no está corriendo en localhost:5432${NC}"
    echo -e "${YELLOW}Por favor inicia PostgreSQL antes de continuar${NC}"
    echo ""
    echo "Opciones:"
    echo "  - macOS: brew services start postgresql"
    echo "  - Linux: sudo systemctl start postgresql"
    echo "  - Docker: docker-compose up -d postgres"
    echo ""
    read -p "¿Deseas continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} PostgreSQL está corriendo"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Iniciando servicios...${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Iniciar Backend
echo -e "${GREEN}[Backend]${NC} Iniciando FastAPI en http://localhost:8000"
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
echo -e "${YELLOW}Esperando a que el backend esté listo...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend listo"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Error: Backend no respondió después de 30 segundos${NC}"
        echo -e "${YELLOW}Revisa backend.log para más detalles${NC}"
        cleanup
    fi
    sleep 1
done

# Iniciar Frontend
echo -e "${GREEN}[Frontend]${NC} Iniciando Vite en http://localhost:3000"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Servicios iniciados correctamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📊 ${GREEN}Backend API:${NC}      http://localhost:8000"
echo -e "📚 ${GREEN}API Docs:${NC}         http://localhost:8000/docs"
echo -e "🌐 ${GREEN}Frontend:${NC}         http://localhost:3000"
echo ""
echo -e "📝 Logs:"
echo -e "   Backend:  tail -f backend.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener todos los servicios${NC}"
echo ""

# Mantener el script corriendo
wait
