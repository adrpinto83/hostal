# 🔐 Credenciales de Acceso - Sistema de Hostal

## ✅ Usuarios de Prueba Creados

### Administrador
```
Email: admin@hostal.local
Contraseña: admin123
Rol: admin
Estado: Aprobado ✅
```

### Recepcionista
```
Email: recepcionista@hostal.local
Contraseña: recep123
Rol: recepcionista
Estado: Aprobado ✅
```

### Personal de Prueba (Staff)
Estos son usuarios generados automáticamente con los datos de prueba:

1. **juan.pérez@hostal.local** - Staff (Limpieza)
2. **maría.garcía@hostal.local** - Staff (Limpieza)
3. **carlos.lópez@hostal.local** - Staff (Recepcionista)
4. **ana.rodríguez@hostal.local** - Staff (Recepcionista)
5. **luis.martínez@hostal.local** - Staff (Mantenimiento)
6. **rosa.sánchez@hostal.local** - Staff (Gerente)

> Nota: Los usuarios de Staff tienen contraseña hasheada y no se puede usar directamente. Usar Admin o Recepcionista.

---

## 🔑 Cómo Ingresar

### 1. Obtener Token (Login)

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hostal.local",
    "password": "admin123"
  }'
```

**Respuesta exitosa:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Usar el Token en Requests

Agregar el token en el header `Authorization`:

```bash
curl -X GET http://localhost:8000/api/v1/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔐 Acceso a Endpoints

### Por Rol:

| Endpoint | Admin | Recepcionista | Staff |
|----------|-------|---------------|-------|
| `/api/v1/payments-v2/mobile-venezuela` | ✅ | ✅ | ❌ |
| `/api/v1/payments-v2/stripe/create-intent` | ✅ | ✅ | ❌ |
| `/api/v1/webhooks/stripe` | ✅ | ✅ | ✅ |
| `/api/v1/guests` | ✅ | ✅ | ❌ |
| `/api/v1/rooms` | ✅ | ✅ | ❌ |
| `/api/v1/reservations` | ✅ | ✅ | ❌ |
| `/api/v1/audit` | ✅ | ❌ | ❌ |
| `/api/v1/backup` | ✅ | ❌ | ❌ |

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Login y Obtener Token

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hostal.local",
    "password": "admin123"
  }' | jq -r '.access_token')

# 2. Guardar el token
echo "Token: $TOKEN"

# 3. Usar el token
curl -X GET http://localhost:8000/api/v1/guests \
  -H "Authorization: Bearer $TOKEN"
```

### Ejemplo 2: Crear Pago Banco Móvil

```bash
TOKEN="tu_token_aqui"

curl -X POST http://localhost:8000/api/v1/payments-v2/mobile-venezuela \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guest_id": 1,
    "amount": 100000,
    "currency": "VES",
    "phone_number": "0414-1234567",
    "cedula": "V-12.345.678",
    "bank_code": "0102",
    "transaction_reference": "123456",
    "description": "Pago de reserva"
  }'
```

### Ejemplo 3: Crear Stripe PaymentIntent

```bash
TOKEN="tu_token_aqui"

curl -X POST http://localhost:8000/api/v1/payments-v2/stripe/create-intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guest_id": 1,
    "amount": 100.00,
    "currency": "usd",
    "description": "Room payment"
  }'
```

---

## 🔍 Ver el Token en Decodificado

El JWT contiene información del usuario:

```bash
# Instalar jq si no lo tienes
# brew install jq (macOS)
# apt-get install jq (Ubuntu)

# Decodificar token (nota: solo muestra la información, no valida la firma)
echo "eyJ0eXAiOiJKV1QiLCJhbGc..." | \
  jq -R 'split(".") | .[1] | @base64d | fromjson'
```

**Resultado:**
```json
{
  "sub": "1",
  "email": "admin@hostal.local",
  "role": "admin",
  "exp": 1700000000
}
```

---

## ⏱️ Expiración del Token

- Los tokens expiran después de **24 horas**
- Si el token expira, debes hacer login nuevamente
- Ver el `exp` en la sección decodificada para saber cuándo expira

---

## 🐛 Troubleshooting

### "Invalid credentials"
- Verifica que el email y contraseña sean exactos (case-sensitive)
- Verifica que el usuario está aprobado

### "User not approved"
- El usuario debe ser aprobado por un administrador
- Solo usuarios admin pueden auto-aprobarse

### "Permission denied"
- Tu rol no tiene permisos para ese endpoint
- Usa un usuario con rol superior

### "Invalid token"
- El token puede haber expirado
- El token puede estar mal formado
- Obtén un nuevo token haciendo login

---

## 📱 Acceso a Swagger UI

Puedes probar los endpoints interactivamente en:

```
http://localhost:8000/docs
```

O en ReDoc:

```
http://localhost:8000/redoc
```

**En Swagger UI:**
1. Click en "Authorize" (arriba a la derecha)
2. Paste el token: `eyJ0eXAi...` (sin "Bearer ")
3. Los endpoints que requieren auth ahora funcionarán

---

## 🔒 Seguridad

⚠️ **IMPORTANTE:**
- Estas credenciales son **solo para desarrollo**
- Nunca uses estas credenciales en producción
- En producción, implementa:
  - Contraseñas fuertes
  - Autenticación de dos factores (2FA)
  - Rotación regular de tokens
  - HTTPS (no HTTP)
  - Rate limiting en endpoints de login

---

## Próximos Pasos

1. **Registrar un nuevo usuario** (opcional)
   ```bash
   POST /api/v1/auth/register
   Body: {
     "email": "nuevo@hostal.local",
     "password": "contraseña_fuerte"
   }
   ```

2. **Aprobar el usuario** (como admin)
   ```bash
   POST /api/v1/auth/approve/{user_id}
   ```

3. **Cambiar contraseña** (como usuario)
   ```bash
   POST /api/v1/auth/change-password
   Body: {
     "current_password": "contraseña_actual",
     "new_password": "contraseña_nueva"
   }
   ```

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en la consola del servidor
2. Verifica que el servidor está corriendo (`Application startup complete`)
3. Verifica la conexión a la base de datos
4. Revisa la documentación en `/docs`
