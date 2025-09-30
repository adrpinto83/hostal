# app/core/network.py
import os


def notify_whitelist_add(mac: str, guest, device) -> None:
    """
    Aquí llamarías a la API del equipo de red para permitir la MAC.
    Ejemplos:
      - pfSense: POST /api/v1/captiveportal/allowedmacs
      - UniFi/Omada: endpoint para authorized_macs / MAC filter list
    """
    if os.getenv("NETWORK_DEBUG") == "1":
        print(f"[NETWORK] allow {mac} (guest_id={guest.id} device_id={device.id})")


def notify_whitelist_remove(mac: str) -> None:
    """Quitar MAC de la whitelist en el equipo de red."""
    if os.getenv("NETWORK_DEBUG") == "1":
        print(f"[NETWORK] revoke {mac}")
