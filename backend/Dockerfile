# ---- Etapa 1: Build ----
# Usamos una imagen completa de Python para instalar dependencias
FROM python:3.11-slim as builder

# Directorio de trabajo dentro de la imagen
WORKDIR /app

# Instalar dependencias del sistema (si fueran necesarias, ej. para compilar librerías)
# RUN apt-get update && apt-get install -y ...

# Crear un entorno virtual aislado
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Instalar dependencias de Python en el venv
# Copiamos solo los requirements primero para aprovechar el cache de Docker
COPY ./requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt


# ---- Etapa 2: Final ----
# Usamos una imagen base mínima para la versión final
FROM python:3.11-slim

# Directorio de trabajo
WORKDIR /app

# Copiar el entorno virtual con las dependencias ya instaladas desde la etapa de 'builder'
COPY --from=builder /opt/venv /opt/venv

# Copiar el código de la aplicación
COPY . .

# Exponer el puerto en el que correrá la aplicación
EXPOSE 8000

# Activar el entorno virtual y definir el comando de arranque
ENV PATH="/opt/venv/bin:$PATH"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
