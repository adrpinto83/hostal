#!/bin/bash

# Script para iniciar el frontend del sistema de hostal

echo "🚀 Iniciando Frontend del Sistema de Hostal..."
echo ""

# Navegar al directorio frontend
cd "$(dirname "$0")/frontend"

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias de Node.js..."
    npm install
    echo "✓ Dependencias instaladas"
fi

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo "⚙️  Creando archivo .env..."
    cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:8000
EOF
    echo "✓ Archivo .env creado"
fi

echo ""
echo "✅ Frontend configurado correctamente"
echo ""
echo "🌐 Iniciando servidor en http://localhost:3000"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""

# Iniciar servidor
npm run dev
