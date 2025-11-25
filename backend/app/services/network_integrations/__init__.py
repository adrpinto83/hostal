# app/services/network_integrations/__init__.py
"""
Servicios de integración con dispositivos de red.
Soporta múltiples marcas: Ubiquiti, Mikrotik, Cisco, TP-Link, etc.
"""
from .base import NetworkIntegrationBase
from .ubiquiti import UbiquitiIntegration
from .mikrotik import MikrotikIntegration
from .cisco import CiscoIntegration
from .openwrt import OpenWrtIntegration

__all__ = [
    "NetworkIntegrationBase",
    "UbiquitiIntegration",
    "MikrotikIntegration",
    "CiscoIntegration",
    "OpenWrtIntegration",
]
