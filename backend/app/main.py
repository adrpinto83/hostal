from fastapi import FastAPI
from .routers import health, auth, users, guests, devices, rooms, room_rates, reservations
import app.routers.reservations as reservations  # <-- añade guests
import app.routers.room_rates as room_rates
import app.routers.rooms as rooms 

app = FastAPI(title="Hostal API (with auth & roles)")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(guests.router)  # <-- registra el router
app.include_router(devices.router) 
app.include_router(reservations.router)
app.include_router(room_rates.router)   
app.include_router(rooms.router)
@app.get("/", tags=["root"])
def root():
    return {"message": "Hostal API up. See /docs"}
