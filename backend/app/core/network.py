# app/core/network.py
"""
Utilidades para integración con equipos de red (routers, firewalls).
Implementa funciones para control de acceso a internet por dispositivo (MAC).

INTEGRACIÓN CON ROUTERS:
- pfSense: API REST para gestión de firewall
- UniFi Controller: UniFi API para gestión de redes
- MikroTik: RouterOS API
- TP-Link Omada: Omada SDN Controller API

Para implementar integración real, configurar variables de entorno:
- ROUTER_TYPE: pfsense, unifi, mikrotik, omada
- ROUTER_API_URL: URL del controlador/router
- ROUTER_API_KEY: API key o token de autenticación
- ROUTER_API_USER: Usuario (si aplica)
- ROUTER_API_PASSWORD: Password (si aplica)
"""
import os
import structlog
import httpx
from typing import Optional

log = structlog.get_logger()

# Configuración de router desde environment
ROUTER_TYPE = os.getenv("ROUTER_TYPE", "debug")  # debug, pfsense, unifi, mikrotik, omada
ROUTER_API_URL = os.getenv("ROUTER_API_URL")
ROUTER_API_KEY = os.getenv("ROUTER_API_KEY")
ROUTER_API_USER = os.getenv("ROUTER_API_USER")
ROUTER_API_PASSWORD = os.getenv("ROUTER_API_PASSWORD")
NETWORK_DEBUG = os.getenv("NETWORK_DEBUG", "1") == "1"


class RouterIntegrationError(Exception):
    """Error en integración con router."""
    pass


def notify_whitelist_add(mac: str, guest, device) -> None:
    """
    Agrega MAC a la whitelist del router para permitir acceso a internet.

    Ejemplos de integración:
      - pfSense: POST /api/v1/captiveportal/allowedmacs
      - UniFi: POST /api/s/default/cmd/stamgr {"cmd": "authorize-guest", "mac": "..."}
      - MikroTik: /ip/hotspot/user/add
      - Omada: POST /api/v2/sites/{siteId}/clients/{mac}/block
    """
    if NETWORK_DEBUG:
        log.info("network_whitelist_add", mac=mac, guest_id=guest.id, device_id=device.id)

    if ROUTER_TYPE == "debug":
        # Modo debug: solo loggear
        return

    # Implementación real depende del router
    # Ejemplo para UniFi Controller:
    if ROUTER_TYPE == "unifi":
        _unifi_authorize_mac(mac)
    elif ROUTER_TYPE == "pfsense":
        _pfsense_allow_mac(mac)
    # Agregar otros routers según necesidad


def notify_whitelist_remove(mac: str) -> None:
    """Quita MAC de la whitelist del router."""
    if NETWORK_DEBUG:
        log.info("network_whitelist_remove", mac=mac)

    if ROUTER_TYPE == "debug":
        return

    if ROUTER_TYPE == "unifi":
        _unifi_deauthorize_mac(mac)
    elif ROUTER_TYPE == "pfsense":
        _pfsense_block_mac(mac)


def notify_router_block(mac: str) -> None:
    """
    Bloquea acceso a internet de un dispositivo (MAC).
    Se usa para suspensión manual de internet.
    """
    if NETWORK_DEBUG:
        log.info("network_router_block", mac=mac)

    if ROUTER_TYPE == "debug":
        return

    if ROUTER_TYPE == "unifi":
        _unifi_block_client(mac)
    elif ROUTER_TYPE == "pfsense":
        _pfsense_block_mac(mac)
    elif ROUTER_TYPE == "mikrotik":
        _mikrotik_block_mac(mac)


def notify_router_unblock(mac: str) -> None:
    """
    Desbloquea acceso a internet de un dispositivo (MAC).
    Se usa para reanudar internet después de suspensión.
    """
    if NETWORK_DEBUG:
        log.info("network_router_unblock", mac=mac)

    if ROUTER_TYPE == "debug":
        return

    if ROUTER_TYPE == "unifi":
        _unifi_unblock_client(mac)
    elif ROUTER_TYPE == "pfsense":
        _pfsense_allow_mac(mac)
    elif ROUTER_TYPE == "mikrotik":
        _mikrotik_unblock_mac(mac)


# ============================================================================
# IMPLEMENTACIONES ESPECÍFICAS POR ROUTER
# ============================================================================

def _unifi_api_request(method: str, endpoint: str, data: Optional[dict] = None):
    """Helper para hacer requests a UniFi Controller API."""
    if not ROUTER_API_URL:
        raise RouterIntegrationError("ROUTER_API_URL not configured")

    url = f"{ROUTER_API_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = {}

    if ROUTER_API_KEY:
        headers["Authorization"] = f"Bearer {ROUTER_API_KEY}"

    try:
        with httpx.Client(verify=False) as client:  # verify=False for self-signed certs
            response = client.request(method, url, json=data, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        log.error("unifi_api_error", error=str(e), endpoint=endpoint)
        raise RouterIntegrationError(f"UniFi API error: {e}")


def _unifi_authorize_mac(mac: str):
    """Autoriza una MAC en UniFi Controller."""
    _unifi_api_request("POST", "/api/s/default/cmd/stamgr", {
        "cmd": "authorize-guest",
        "mac": mac,
        "minutes": 0  # 0 = ilimitado
    })
    log.info("unifi_authorize_success", mac=mac)


def _unifi_deauthorize_mac(mac: str):
    """Desautoriza una MAC en UniFi Controller."""
    _unifi_api_request("POST", "/api/s/default/cmd/stamgr", {
        "cmd": "unauthorize-guest",
        "mac": mac
    })
    log.info("unifi_deauthorize_success", mac=mac)


def _unifi_block_client(mac: str):
    """Bloquea un cliente en UniFi Controller."""
    _unifi_api_request("POST", "/api/s/default/cmd/stamgr", {
        "cmd": "block-sta",
        "mac": mac
    })
    log.info("unifi_block_success", mac=mac)


def _unifi_unblock_client(mac: str):
    """Desbloquea un cliente en UniFi Controller."""
    _unifi_api_request("POST", "/api/s/default/cmd/stamgr", {
        "cmd": "unblock-sta",
        "mac": mac
    })
    log.info("unifi_unblock_success", mac=mac)


def _pfsense_allow_mac(mac: str):
    """Permite una MAC en pfSense."""
    # Implementación específica para pfSense API
    # Requiere pfsense-api package o custom scripts
    log.warning("pfsense_integration_not_implemented", action="allow", mac=mac)


def _pfsense_block_mac(mac: str):
    """Bloquea una MAC en pfSense."""
    log.warning("pfsense_integration_not_implemented", action="block", mac=mac)


def _mikrotik_block_mac(mac: str):
    """Bloquea una MAC en MikroTik RouterOS."""
    # Implementación con librosa RouterOS API
    log.warning("mikrotik_integration_not_implemented", action="block", mac=mac)


def _mikrotik_unblock_mac(mac: str):
    """Desbloquea una MAC en MikroTik RouterOS."""
    log.warning("mikrotik_integration_not_implemented", action="unblock", mac=mac)
