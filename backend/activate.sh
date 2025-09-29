#!/bin/bash
# Activa el entorno virtual del proyecto

# Desactiva conda si está activo
if [[ ! -z "$CONDA_DEFAULT_ENV" ]]; then
  conda deactivate >/dev/null 2>&1
fi

# Activa el venv del proyecto
source .venv/bin/activate

echo "✅ Entorno .venv activado (Python: $(python --version))"
