#!/bin/bash

# Nombre del archivo de respaldo con fecha
BACKUP_FILE="hostal-backend-$(date +%Y-%m-%d).tar.gz"

# Directorio base del proyecto
PROJECT_DIR="$HOME/hostal-starter-fastapi"

# Directorio temporal de respaldo
TEMP_DIR="$HOME/hostal-backup-temp"

echo "🚀 Iniciando respaldo del proyecto..."

# Limpiar temporales anteriores
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copiar solo lo necesario
rsync -av --progress "$PROJECT_DIR/backend" "$TEMP_DIR" \
  --exclude "__pycache__" \
  --exclude "*.pyc" \
  --exclude "*.pyo" \
  --exclude ".pytest_cache" \
  --exclude ".venv" \
  --exclude "*.zip"

# Copiar archivos raíz importantes
cp "$PROJECT_DIR/.gitignore" "$TEMP_DIR/" 2>/dev/null
cp "$PROJECT_DIR/README.md" "$TEMP_DIR/" 2>/dev/null

# Crear archivo comprimido final
tar -czvf "$BACKUP_FILE" -C "$TEMP_DIR" .

echo "✅ Respaldo completado: $BACKUP_FILE"
