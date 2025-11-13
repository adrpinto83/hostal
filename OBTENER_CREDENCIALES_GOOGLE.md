# 🔑 Obtener Credenciales de Google OAuth - Guía Paso a Paso

## ⚠️ Problema Actual
```
Error: Missing required parameter: client_id
Error 400: invalid_request
```

**Causa:** VITE_GOOGLE_CLIENT_ID no está configurado en `frontend/.env`

**Solución:** Obtener credenciales de Google y configurarlas

---

## 📋 Obtener Client ID y Client Secret

### Paso 1: Ir a Google Cloud Console
1. Abre: https://console.cloud.google.com/
2. Si no tienes una cuenta de Google, crea una
3. Inicia sesión con tu cuenta de Google

### Paso 2: Crear un Proyecto Nuevo
1. En la parte superior izquierda, haz clic en **"Selecciona un proyecto"**
2. Haz clic en **"Nuevo proyecto"**
3. Nombre del proyecto: `Hostal Starlight`
4. Haz clic en **"Crear"**
5. Espera a que se cree (puede tardar 30 segundos)

### Paso 3: Habilitar Google+ API
1. En el menú izquierdo, ve a **"APIs y servicios"** → **"Biblioteca"**
2. Busca: `Google+ API`
3. Haz clic en el resultado
4. Haz clic en el botón azul **"Habilitar"**
5. Espera a que se habilite

### Paso 4: Crear Credenciales OAuth 2.0
1. En el menú izquierdo, ve a **"APIs y servicios"** → **"Credenciales"**
2. Haz clic en **"+ Crear credenciales"** (botón azul arriba)
3. Selecciona **"ID de cliente de OAuth"**

#### Si te pide crear "Pantalla de consentimiento de OAuth":
1. Selecciona tipo de usuario: **"Externo"**
2. Haz clic en **"Crear"**
3. Completa el formulario:
   - **Nombre de la app:** Hostal Starlight
   - **Correo de soporte:** tu_email@gmail.com
   - **Correo de contacto del desarrollador:** tu_email@gmail.com
4. Haz clic en **"Guardar y continuar"**
5. En "Permisos": Haz clic en **"Agregar o quitar permisos"**
   - Busca: `email`, `profile`, `openid`
   - Selecciona los tres
   - Haz clic en **"Actualizar"**
6. Haz clic en **"Guardar y continuar"**
7. Haz clic en **"Crear credenciales"** (botón azul arriba a la derecha)
8. Selecciona **"ID de cliente de OAuth"**

### Paso 5: Configurar Aplicación Web
En la ventana "Crear ID de cliente de OAuth":

1. **Tipo de aplicación:** Selecciona **"Aplicación web"**
2. **Nombre:** Hostal Frontend
3. **URIs autorizados de JavaScript:** Haz clic en **"Agregar URI"** y agrega:
   ```
   http://localhost:3000
   http://localhost:5173
   ```
4. **URIs de redirección autorizados:** (opcional, para producción)
   ```
   http://localhost:8000/auth/callback
   ```
5. Haz clic en **"Crear"**

### Paso 6: Copiar Credenciales
En la ventana emergente que aparece:

1. **Copia el "ID de cliente"** (es una cadena larga como `123456789-abcdef.apps.googleusercontent.com`)
2. **Copia la "Contraseña de cliente"** (es otra cadena larga)

📌 **GUARDA ESTAS CREDENCIALES EN UN LUGAR SEGURO**

---

## ⚙️ Configurar en tu Aplicación

### Backend - Actualizar archivo .env

Abre: `/home/adrpinto/hostal/backend/.env`

Busca estas líneas:
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Completa con tus credenciales:
```env
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu_client_secret_aqui
```

### Frontend - Actualizar archivo .env

Abre o crea: `/home/adrpinto/hostal/frontend/.env`

Agrega esta línea (solo el CLIENT_ID, NO el SECRET):
```env
VITE_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
```

**Ejemplo completo del archivo:**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
```

---

## 🔄 Reiniciar Servidores

Después de actualizar los archivos `.env`, **REINICIA los servidores**:

### Terminal 1 - Backend
```bash
# Presiona Ctrl+C para detener
# Luego ejecuta:
cd /home/adrpinto/hostal/backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 2 - Frontend
```bash
# Presiona Ctrl+C para detener
# Luego ejecuta:
cd /home/adrpinto/hostal/frontend
npm run dev
```

---

## ✅ Verificar que Funciona

1. Abre: http://localhost:5173/login
2. Deberías ver el botón **"Continúa con Google"**
3. Si aún ves error, verifica:
   - ✓ Las credenciales están en .env
   - ✓ Reiniciaste los servidores
   - ✓ El archivo .env está en la carpeta correcta
   - ✓ No hay espacios extras en los valores

---

## 🆘 Solución de Problemas

### Error: "Invalid client"
- Verifica que GOOGLE_CLIENT_ID es correcto (sin espacios)
- Verifica que los URIs autorizados incluyen `http://localhost:5173`

### Error: "Redirect URI mismatch"
- Ve a Google Cloud Console
- Credenciales → Tu aplicación web
- Verifica que `http://localhost:5173` está en "URIs de redirección autorizados"

### El botón Google no aparece
- Verifica que reiniciaste el servidor frontend
- Abre DevTools (F12) y revisa la consola
- Verifica que VITE_GOOGLE_CLIENT_ID está en .env

### Error: "Missing required parameter: client_id"
- Verifica que VITE_GOOGLE_CLIENT_ID está en `/frontend/.env`
- Reinicia el servidor frontend

---

## ⚠️ Seguridad

- ✅ **GOOGLE_CLIENT_ID** - Puede estar en frontend (es público)
- ❌ **GOOGLE_CLIENT_SECRET** - NUNCA en frontend, solo en backend
- ❌ **Nunca** subas archivos `.env` a git
- ✅ El `.gitignore` ya incluye `.env`

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas, verifica:

1. ¿Google Cloud Console muestra "Credenciales"?
2. ¿Las URIs autorizadas incluyen localhost:5173?
3. ¿Reiniciaste los servidores después de cambiar .env?
4. ¿El client_id es idéntico en backend y frontend?

---

**Una vez que hayas completado estos pasos, el botón "Continúa con Google" debería funcionar! 🎉**
