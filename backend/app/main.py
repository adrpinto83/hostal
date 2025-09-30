# app/main.py
from fastapi import FastAPI

# importa los routers una sola vez, sin alias duplicados
from app.routers import (
    auth,
    devices,
    guests,
    health,
    reservations,
    room_rates,
    rooms,
    users,
)

app = FastAPI(title="Hostal API (with auth & roles)")

# Montaje de routers:
# - health suele no tener prefix en el router
app.include_router(health.router)

# Si auth.router YA tiene prefix="/auth" dentro del archivo, no le pongas otro aquí.
# Si NO lo tiene, entonces sí ponle prefix aquí. (ajusta según tu archivo)
app.include_router(auth.router)  # o app.include_router(auth.router, prefix="/auth")

# Igual criterio para los demás: NO repitas el prefix si ya está en el router.
app.include_router(users.router)  # users: si ya define prefix="/users" en el router
app.include_router(guests.router)  # guests: idem
app.include_router(rooms.router)  # rooms: idem
app.include_router(room_rates.router)  # room_rates: típicamente prefix="/rooms" dentro del router
app.include_router(
    reservations.router
)  # reservations: típicamente prefix="/reservations" dentro del router
app.include_router(
    devices.router
)  # devices: típicamente prefix="/guests/{guest_id}/devices" dentro del router
