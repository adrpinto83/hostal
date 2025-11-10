# 🚀 Guía de Deployment - Hostal API

Esta guía cubre el proceso de deployment de la API de Hostal en diferentes entornos.

## 📋 Pre-requisitos

- Python 3.10 o superior
- PostgreSQL 14 o superior
- Git
- Acceso SSH al servidor (para producción)

## 🔧 Configuración de Entorno

### 1. Variables de Entorno

Copia el archivo de ejemplo y configura las variables:

```bash
cp .env.example .env
```

#### Variables Críticas para Producción

```bash
# OBLIGATORIO: Cambiar en producción
APP_ENV=prod
SECRET_KEY=<generar-con-comando-abajo>
DEBUG=False

# Generar SECRET_KEY seguro:
python -c 'import secrets; print(secrets.token_urlsafe(32))'

# Base de datos
POSTGRES_USER=hostal_prod
POSTGRES_PASSWORD=<password-seguro>
POSTGRES_DB=hostal_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# CORS - Lista de dominios permitidos
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

## 🐳 Deployment con Docker (Recomendado)

### Desarrollo

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Detener servicios
docker-compose down
```

### Producción con Docker

1. **Crear archivo docker-compose.prod.yml**:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    networks:
      - hostal-network

  api:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    environment:
      - APP_ENV=prod
      - DATABASE_URL=postgresql+psycopg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    env_file:
      - .env
    depends_on:
      - postgres
    restart: always
    networks:
      - hostal-network
    ports:
      - "8000:8000"

volumes:
  postgres_data:

networks:
  hostal-network:
    driver: bridge
```

2. **Ejecutar**:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🖥️ Deployment Manual (Sin Docker)

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install python3.11 python3.11-venv python3-pip postgresql nginx -y
```

### 2. Configurar PostgreSQL

```bash
# Crear usuario y base de datos
sudo -u postgres psql

CREATE DATABASE hostal_db;
CREATE USER hostal_prod WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE hostal_db TO hostal_prod;
\q
```

### 3. Clonar y Configurar Aplicación

```bash
# Clonar repositorio
cd /opt
sudo git clone <tu-repo> hostal-api
cd hostal-api/backend

# Crear entorno virtual
python3.11 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con valores de producción
```

### 4. Ejecutar Migraciones

```bash
# Activar entorno virtual si no está activo
source venv/bin/activate

# Ejecutar migraciones
alembic upgrade head
```

### 5. Crear Usuario Administrador

```bash
# Usando el script de seed
python scripts/seed_admin.py

# O usando el endpoint bootstrap
curl -X POST http://localhost:8000/api/v1/users/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@tudominio.com", "password": "password_seguro", "role": "admin"}'
```

### 6. Configurar Servicio Systemd

Crear archivo `/etc/systemd/system/hostal-api.service`:

```ini
[Unit]
Description=Hostal API
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/hostal-api/backend
Environment="PATH=/opt/hostal-api/backend/venv/bin"
ExecStart=/opt/hostal-api/backend/venv/bin/uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-config logging.conf
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Habilitar y iniciar servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hostal-api
sudo systemctl start hostal-api
sudo systemctl status hostal-api
```

### 7. Configurar Nginx como Reverse Proxy

Crear archivo `/etc/nginx/sites-available/hostal-api`:

```nginx
upstream hostal_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.tudominio.com;

    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.tudominio.com;

    # Certificados SSL (usar certbot)
    ssl_certificate /etc/letsencrypt/live/api.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tudominio.com/privkey.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    # Headers de seguridad
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logs
    access_log /var/log/nginx/hostal-api-access.log;
    error_log /var/log/nginx/hostal-api-error.log;

    # Proxy settings
    location / {
        proxy_pass http://hostal_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health checks
    location /healthz {
        proxy_pass http://hostal_api/healthz;
        access_log off;
    }

    # Metrics (proteger en producción)
    location /metrics {
        deny all;  # O permitir solo IPs específicas
    }
}
```

Habilitar sitio:

```bash
sudo ln -s /etc/nginx/sites-available/hostal-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Configurar SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.tudominio.com
```

## 🔄 Actualización de la Aplicación

```bash
cd /opt/hostal-api/backend

# Activar entorno virtual
source venv/bin/activate

# Obtener últimos cambios
git pull origin main

# Actualizar dependencias
pip install -r requirements.txt

# Ejecutar migraciones
alembic upgrade head

# Reiniciar servicio
sudo systemctl restart hostal-api

# Verificar estado
sudo systemctl status hostal-api
```

## 📊 Monitoreo

### Logs de la Aplicación

```bash
# Ver logs del servicio
sudo journalctl -u hostal-api -f

# Ver logs de Nginx
sudo tail -f /var/log/nginx/hostal-api-access.log
sudo tail -f /var/log/nginx/hostal-api-error.log
```

### Health Checks

```bash
# Liveness (aplicación corriendo)
curl https://api.tudominio.com/healthz

# Readiness (con dependencias)
curl https://api.tudominio.com/readyz

# Métricas Prometheus
curl http://localhost:8000/metrics
```

## 🔐 Seguridad

### Checklist de Seguridad

- [ ] SECRET_KEY configurado con valor aleatorio seguro (32+ caracteres)
- [ ] DEBUG=False en producción
- [ ] CORS_ORIGINS configurado con dominios específicos
- [ ] Certificados SSL instalados y renovación automática configurada
- [ ] Firewall configurado (solo puertos 80, 443, 22)
- [ ] PostgreSQL no expuesto públicamente
- [ ] Contraseñas de BD seguras y únicas
- [ ] Backups automáticos configurados
- [ ] Rate limiting habilitado
- [ ] Headers de seguridad configurados
- [ ] Logs de auditoría habilitados

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 📦 Backups

### Script de Backup Automático

```bash
# Usar el script incluido
./scripts/backup_hostal.sh

# Configurar cron para backups diarios
crontab -e
# Agregar: 0 2 * * * /opt/hostal-api/backend/scripts/backup_hostal.sh
```

### Restaurar Backup

```bash
./scripts/restore.sh /path/to/backup.sql
```

## 🐛 Troubleshooting

### La aplicación no inicia

```bash
# Verificar logs
sudo journalctl -u hostal-api -n 50

# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar conectividad a BD
psql -h localhost -U hostal_prod -d hostal_db
```

### Errores 502 Bad Gateway

```bash
# Verificar que la API está corriendo
curl http://localhost:8000/healthz

# Verificar configuración de Nginx
sudo nginx -t

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### Migraciones fallan

```bash
# Verificar estado actual
alembic current

# Ver historial
alembic history

# Aplicar migración específica
alembic upgrade <revision>

# Rollback
alembic downgrade -1
```

## 📞 Soporte

Para problemas o preguntas:
- Revisar logs de aplicación y Nginx
- Verificar variables de entorno
- Consultar documentación de FastAPI: https://fastapi.tiangolo.com
- Consultar documentación de Alembic: https://alembic.sqlalchemy.org
