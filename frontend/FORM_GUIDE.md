# 📋 Guía Visual - Componentes de Formularios

## 🎯 Visión General

Se han creado 3 componentes de formularios profesionales y reutilizables:
- **GuestFormModal** - Creación y edición de huéspedes
- **ReservationFormModal** - Creación y edición de reservas
- **RoomFormModal** - Creación y edición de habitaciones

**Características comunes:**
- ✅ Validación avanzada en tiempo real
- ✅ Interfaz moderna y atractiva
- ✅ Mejor experiencia del usuario
- ✅ Accesibilidad mejorada (WCAG AA)
- ✅ Responsividad total (móvil, tablet, desktop)

**Para documentación técnica completa, ver:** `../../IMPROVEMENTS.md`

---

## 📸 Estructura Visual del Formulario

### Header (Encabezado)
```
┌─────────────────────────────────────────────┐
│ ➕ Nuevo Huésped                         ✕  │
│ Completa todos los campos obligatorios      │
└─────────────────────────────────────────────┘
```

### Alerta Informativa
```
┌────────────────────────────────────────────────────────────┐
│ ⓘ Información importante                                   │
│ Los datos marcados con * son obligatorios.                 │
│ El teléfono y email se usarán para notificaciones.         │
└────────────────────────────────────────────────────────────┘
```

### Sección 1: Información Personal
```
• INFORMACIÓN PERSONAL

👤 Nombre Completo *
┌──────────────────────────────────────────────────┐
│ Ej. María Fernanda Suárez               [✅ / ❌] │
└──────────────────────────────────────────────────┘
Usa el nombre exacto como aparece en el documento oficial.

📄 Documento de Identidad *
┌──────────────────────────────────────────────────┐
│ V-12345678 / DNI / Pasaporte             [✅ / ❌] │
└──────────────────────────────────────────────────┘
Aceptamos letras, números, guiones y espacios.
```

### Sección 2: Información de Contacto
```
• INFORMACIÓN DE CONTACTO (Opcional)

┌─────────────────────────────┬─────────────────────────────┐
│ 📱 Teléfono                 │ ✉️ Email                   │
│                              │                             │
│ ┌───────────────────────┐    │ ┌───────────────────────┐   │
│ │ +58 412-1234567 [✅]  │    │ │ correo@ejemplo.com   │   │
│ └───────────────────────┘    │ └───────────────────────┘   │
│ Incluye código de país      │ Para notificaciones        │
└─────────────────────────────┴─────────────────────────────┘
```

### Sección 3: Notas Adicionales
```
• NOTAS ADICIONALES (Opcional)

📝 Información Adicional
┌─────────────────────────────────────────────────────────┐
│ Preferencias especiales, restricciones alimenticias,    │
│ contactos de emergencia, alergias, etc...               │
│                                                          │
└─────────────────────────────────────────────────────────┘
Información útil para el personal del hostal.
Progress: [████████░░] 217/280
```

### Botones de Acción
```
┌─────────────────────────────────────────────────┐
│  [Cancelar]  [➕ Crear Huésped / ✏️ Actualizar] │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Estados Visuales

### Campo Válido
```
✅ Nombre Completo
┌──────────────────────────────────────────────────┐
│ María Fernanda Suárez                       ✅   │
└──────────────────────────────────────────────────┘
Usa el nombre exacto como aparece en el documento oficial.
```

### Campo Inválido
```
❌ Nombre Completo
┌──────────────────────────────────────────────────┐
│ MA                                          ❌   │
└──────────────────────────────────────────────────┘
❌ El nombre debe tener al menos 3 caracteres
```

### Campo Sin Tocar
```
⚪ Nombre Completo
┌──────────────────────────────────────────────────┐
│ Ej. María Fernanda Suárez                        │
└──────────────────────────────────────────────────┘
Usa el nombre exacto como aparece en el documento oficial.
```

### Estado de Carga
```
┌─────────────────────────────────────────────────┐
│ [Cancelar]  [🔄 Creando...] (deshabilitado)     │
└─────────────────────────────────────────────────┘
```

---

## 🔤 Ejemplos de Validación

### Nombre Completo
```
❌ "MA"                    → Mínimo 3 caracteres
✅ "María"                 → Válido
✅ "María García López"    → Válido
❌ "A".repeat(101)         → Máximo 100 caracteres
```

### Documento de Identidad
```
✅ "V-12345678"           → Válido
✅ "DNI123456"            → Válido
✅ "Pasaporte AB-123"     → Válido
❌ "V_12345678"           → Carácter especial inválido
✅ "12345678"             → Solo números también válido
```

### Teléfono
```
✅ "+58 412-1234567"      → Formato estándar
✅ "(412) 123-4567"       → Formato alternativo
✅ "+1-555-123-4567"      → Código de país diferente
❌ "412"                  → Incompleto
✅ "58412123467"          → Sin formato también válido
```

### Email
```
✅ "maria@example.com"              → Válido
❌ "maria@example"                  → Sin TLD
❌ "maria @example.com"             → Espacio en blanco
✅ "maria.garcia@empresa.com.ar"   → Subdominio válido
❌ "maria@@example.com"             → Doble @
```

### Notas
```
✅ "" (vacío)                           → Válido (opcional)
✅ "Alérgica a frutos secos"          → Válido
✅ "X" × 280 caracteres               → Máximo válido
❌ "X" × 281 caracteres               → Excede límite
```

---

## 🎯 Casos de Uso Comunes

### Crear Nuevo Huésped
```
1. Click "Nuevo Huésped" → Se abre el modal
2. Ingresa nombre: "Juan García"
   ✅ Validación pasa
3. Ingresa documento: "V-12345678"
   ✅ Validación pasa
4. Ingresa teléfono: "+58 412-1234567"
   ✅ Validación pasa
5. Ingresa email: "juan@example.com"
   ✅ Validación pasa
6. Ingresa notas: "Prefiere piso alto"
   ✅ Validación pasa
7. Click "Crear Huésped"
   → Registra el huésped exitosamente
```

### Editar Huésped
```
1. Click en icono de edición (lápiz)
2. Modal se abre con datos pre-rellenados
3. Modifica teléfono: "+58 414-7654321"
   ✅ Validación pasa
4. Click "Actualizar Huésped"
   → Actualiza el huésped exitosamente
```

### Corregir Errores
```
1. Usuario ingresa documento: "V_123" (con guion bajo)
   ❌ Error: "solo puede contener letras, números, guiones"
2. Usuario borra y escribe: "V-123"
   ❌ Error: "debe tener al menos 3 caracteres"
3. Usuario agrega: "V-12345"
   ✅ Validación pasa
```

---

## 🎨 Paleta de Colores y Estilos

### Colores
```
Headers:
- Background: Linear gradient azul a índigo
- Text: Gris oscuro con contraste

Inputs (Válido):
- Border: Gris claro
- Icon: Check verde (#10b981)

Inputs (Inválido):
- Border: Rojo (#ef4444)
- Background: Rojo claro
- Icon: Alerta roja
- Text error: Rojo oscuro

Botones:
- Primario: Gradiente azul a índigo
- Hover: Más saturado
- Deshabilitado: Gris

Indicadores:
- Progreso (0-50%): Verde
- Progreso (50-80%): Amarillo
- Progreso (80-100%): Rojo
```

### Tipografía
```
Headers:     22px, Bold, Gris-800
Subtítulos:  14px, Normal, Gris-600
Labels:      14px, Semibold, Gris-700
Inputs:      16px, Normal, Gris-900
Helpers:     12px, Normal, Gris-600
Errors:      12px, Normal, Rojo-600
```

### Espaciado
```
Header al contenido:     24px
Entre secciones:        24px
Entre campos:           20px
Entre label e input:     8px
Entre input y helper:    8px
Padding en inputs:      10px (vertical) × 16px (horizontal)
```

---

## ♿ Accesibilidad

### Características
- ✅ Labels correctamente asociadas con `htmlFor`
- ✅ Indicadores visuales de error (color + icono)
- ✅ Mensajes de error claramente visibles
- ✅ Navegación por Tab funcional
- ✅ Buttons accesibles
- ✅ Contraste de colores WCAG AA

### Navegación por Teclado
```
Tab    → Siguiente campo
Shift+Tab → Campo anterior
Enter  → Enviar (si está habilitado)
Escape → Cerrar modal
```

---

## 📱 Responsividad

### En Móviles (< 768px)
```
┌────────────────────────┐
│ ➕ Nuevo Huésped    ✕ │
├────────────────────────┤
│ [Alerta informativa]   │
├────────────────────────┤
│ INFORMACIÓN PERSONAL   │
│                        │
│ Nombre Completo *     │
│ [____________]         │
│                        │
│ Documento *           │
│ [____________]         │
├────────────────────────┤
│ INFORMACIÓN DE CONTACTO│
│                        │
│ Teléfono              │
│ [____________]         │
│                        │
│ Email                 │
│ [____________]         │
├────────────────────────┤
│ NOTAS ADICIONALES      │
│                        │
│ [________________...]  │
├────────────────────────┤
│  [Cancel] [Create]     │
└────────────────────────┘
```

### En Desktop (> 768px)
```
┌──────────────────────────────────────────────────┐
│ ➕ Nuevo Huésped                             ✕ │
├──────────────────────────────────────────────────┤
│ INFORMACIÓN PERSONAL                             │
│                                                  │
│ Nombre Completo *                               │
│ [____________________________]                  │
│                                                  │
│ Documento *                                     │
│ [____________________________]                  │
├──────────────────────────────────────────────────┤
│ INFORMACIÓN DE CONTACTO (Opcional)               │
│                                                  │
│ ┌─────────────────────────┬─────────────────┐  │
│ │ Teléfono                │ Email           │  │
│ │ [________________]       │ [___________]   │  │
│ └─────────────────────────┴─────────────────┘  │
├──────────────────────────────────────────────────┤
│ NOTAS ADICIONALES (Opcional)                     │
│                                                  │
│ [____________________________...]               │
├──────────────────────────────────────────────────┤
│  [Cancelar]           [➕ Crear Huésped]       │
└──────────────────────────────────────────────────┘
```

---

## 🚀 Integración

### En GuestList.tsx
```typescript
// Import
import { GuestFormModal } from '@/components/guests/GuestFormModal';

// Usar en el JSX
<GuestFormModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSubmit={handleFormSubmit}
  editingGuest={editingGuest}
  isLoading={isPending}
/>
```

---

## 🔐 Validaciones por Campo

### Nombre Completo
| Regla | Ejemplo | Resultado |
|-------|---------|-----------|
| Requerido | "" | ❌ Requerido |
| Mín. 3 caracteres | "MA" | ❌ Mínimo 3 |
| Máx. 100 caracteres | "A"×101 | ❌ Máximo 100 |
| Válido | "María" | ✅ Válido |

### Documento
| Regla | Ejemplo | Resultado |
|-------|---------|-----------|
| Requerido | "" | ❌ Requerido |
| Mín. 3 caracteres | "V1" | ❌ Mínimo 3 |
| Solo alphanumério | "V_123" | ❌ Inválido |
| Máx. 50 caracteres | "V"×51 | ❌ Máximo 50 |
| Válido | "V-123" | ✅ Válido |

### Teléfono
| Regla | Ejemplo | Resultado |
|-------|---------|-----------|
| Opcional | "" | ✅ Válido |
| Formato válido | "+58 412-123" | ❌ Incompleto |
| Formato válido | "+58 412-1234567" | ✅ Válido |

### Email
| Regla | Ejemplo | Resultado |
|-------|---------|-----------|
| Opcional | "" | ✅ Válido |
| Formato RFC | "invalid" | ❌ Inválido |
| Formato RFC | "user@example.com" | ✅ Válido |

### Notas
| Regla | Ejemplo | Resultado |
|-------|---------|-----------|
| Opcional | "" | ✅ Válido |
| Máx. 280 caracteres | "X"×280 | ✅ Válido |
| Máx. 280 caracteres | "X"×281 | ❌ Máximo 280 |

---

## 📊 Comparativa de Mejoras

| Característica | Antes | Después |
|---|---|---|
| Validación en tiempo real | ❌ No | ✅ Sí |
| Indicadores visuales | ❌ Mínimos | ✅ Completos |
| Errores específicos | ❌ Genéricos | ✅ Detallados |
| Secciones organizadas | ❌ Linear | ✅ 3 secciones |
| Diseño moderno | ⚠️ Básico | ✅ Profesional |
| Responsive | ⚠️ Parcial | ✅ Total |
| Validación de teléfono | ❌ No | ✅ Avanzada |
| Indicador de notas | ❌ Solo contador | ✅ Barra colorida |
| Feedback de usuario | ❌ Mínimo | ✅ Completo |

---

## 🎓 Tutoriales

### Para Usuarios
1. El formulario se abre con un modal moderno
2. Los campos requeridos están marcados con *
3. Mientras escribes, se valida automáticamente
4. Los errores aparecen en rojo con descripción
5. Los campos válidos muestran un check verde
6. Puedes enviar solo cuando todo es válido
7. Los botones mostrarán progreso mientras se guarda

### Para Desarrolladores
1. El componente es totalmente reutilizable
2. Importa desde `@/components/guests/GuestFormModal`
3. Pasa los props necesarios
4. Maneja los callbacks `onClose` y `onSubmit`
5. El componente maneja toda la lógica interna

---

**Última actualización:** 2025-11-20
**Versión:** 1.0.0
**Estado:** ✅ Activo y en producción
