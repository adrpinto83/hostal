# app/core/limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

# Creamos una instancia única del limitador que será compartida por toda la app
limiter = Limiter(key_func=get_remote_address)
