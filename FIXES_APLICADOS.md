# 🔧 Correcciones Aplicadas al Backend

## Fecha: 2025-11-11

Se detectaron y corrigieron 3 errores críticos que impedían el inicio del backend.

---

## ❌ Error 1: Multiple head revisions en Alembic

### Síntoma
```
ERROR [alembic.util.messaging] Multiple head revisions are present for given argument 'head'
```

### Causa
Había múltiples ramas de migración que divergían en diferentes puntos:
- Rama 1: 0007_complete_hostal_system (desde 5e2a10be4dcb)
- Rama 2: 0003_add_reservations → ... → 41ac75d4a820 (merge anterior)

Esto creaba dos "heads" (puntos finales) en el grafo de migraciones.

### Solución ✅
Creada migración de merge: `0008_merge_all_branches.py`

```python
revision = "0008_merge_all_branches"
down_revision = ("0007_complete_hostal_system", "41ac75d4a820")
```

Esta migración unifica ambas ramas en un solo head.

**Archivo:** `/home/user/hostal/backend/alembic/versions/0008_merge_all_branches.py`

---

## ❌ Error 2: ImportError get_password_hash

### Síntoma
```
ImportError: cannot import name 'get_password_hash' from 'app.core.security'
```

### Causa
El script `start_backend.sh` intentaba importar `get_password_hash`, pero la función en `security.py` se llamaba `hash_password`.

### Solución ✅
Agregado alias de compatibilidad en `app/core/security.py`:

```python
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# Alias para compatibilidad
get_password_hash = hash_password
```

Ahora ambos nombres funcionan correctamente.

**Archivo:** `backend/app/core/security.py` (líneas 22-27)

---

## ❌ Error 3: AssertionError en maintenance router

### Síntoma
```
AssertionError: non-body parameters must be in path, query, header or cookie: actual_cost
```

### Causa
El endpoint `complete_maintenance` usaba `Field()` de Pydantic para el parámetro de query `actual_cost`:

```python
# ❌ Incorrecto
def complete_maintenance(
    maintenance_id: int,
    actual_cost: float | None = Field(None, ge=0, description="..."),
    ...
)
```

En FastAPI, los parámetros de query deben usar `Query()`, no `Field()`.

### Solución ✅
Cambiado `Field` por `Query` en ambos parámetros:

```python
# ✅ Correcto
def complete_maintenance(
    maintenance_id: int,
    actual_cost: float | None = Query(None, ge=0, description="Costo real del mantenimiento"),
    notes: str | None = Query(None, description="Notas adicionales"),
    ...
)
```

**Archivo:** `backend/app/routers/maintenance.py` (líneas 409-415)

---

## 📦 Commit de Correcciones

```
⚡ Correcciones críticas para el backend

- Agregado alias get_password_hash en security.py
- Corregido parámetro actual_cost en maintenance router (Field -> Query)
- Creada migración de merge para resolver múltiples heads de Alembic

Commit: 9418be5
Rama: claude/hostal-sistema-completo-011CUxvy6jvfLhZvXWAcc7Wz
```

---

## ✅ Estado Actual

Todos los errores han sido corregidos y los cambios están en GitHub.

### Archivos Modificados

1. `backend/alembic/versions/0008_merge_all_branches.py` - **NUEVO**
2. `backend/app/core/security.py` - Agregado alias `get_password_hash`
3. `backend/app/routers/maintenance.py` - Corregidos parámetros de query

### Próximos Pasos

Para iniciar el backend ahora:

```bash
cd ~/hostal

# Obtener los últimos cambios
git pull origin claude/hostal-sistema-completo-011CUxvy6jvfLhZvXWAcc7Wz

# Iniciar backend
./start_backend.sh
```

El backend debería iniciar correctamente ahora.

---

## 🎯 Resumen

| Error | Severidad | Estado | Archivo |
|-------|-----------|--------|---------|
| Multiple Alembic heads | 🔴 Crítico | ✅ Resuelto | 0008_merge_all_branches.py |
| get_password_hash missing | 🔴 Crítico | ✅ Resuelto | security.py |
| Field in query param | 🔴 Crítico | ✅ Resuelto | maintenance.py |

**Todos los errores críticos resueltos. El backend está listo para iniciar.** ✅
