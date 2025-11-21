# app/services/payment_validators.py
"""
Validadores específicos para sistemas de pago, con soporte especial
para pagos móviles adaptado a Venezuela.
"""
import re
from typing import Tuple, Optional
from enum import Enum


class VenezuelanBankCode(str, Enum):
    """Códigos de bancos en Venezuela (Banco Móvil)."""
    # Bancos comerciales
    BANCO_DE_VENEZUELA = "0001"  # Banco de Venezuela
    BANESCO = "0002"              # Banesco
    CITIBANK = "0004"             # Citibank
    BANCO_MERCANTIL = "0005"      # Banco Mercantil
    BANCO_PROVINCIAL = "0008"     # Banco Provincial
    BANCO_OCCIDENTAL = "0006"     # Banco Occidental
    BANCO_CARONI = "0009"         # Banco Caroni
    BANCO_FEDEVAL = "0010"        # BanFedeval
    ITAU = "0011"                 # Itaú
    BANCO_TACHIRA = "0013"        # Banco Táchira
    BANCO_EXITO = "0014"          # Banco Éxito
    BANCO_AMAZON = "0015"         # Banco del Amazonas
    BANCO_ACTINVER = "0016"       # Banco Actinver
    BANCO_FINTERRA = "0017"       # Banco Finterra
    BANCO_SOFIMEX = "0018"        # Banco Sofimex
    BANCO_INFONAVIT = "0019"      # Banco Infonavit
    BANCO_DEL_BIENESTAR = "0020"  # Banco del Bienestar
    SANTANDER = "0021"            # Santander
    HSBC = "0027"                 # HSBC
    BARCLAYS = "0030"             # Barclays
    SCOTIABANK = "0032"           # Scotiabank
    ING = "0036"                  # ING
    BANCO_LAZONTANO = "0166"      # Banco Lanzontano
    BANCO_FALABELLA = "0168"      # Banco Falabella
    BANCO_WALMART = "0172"        # Banco Walmart
    AMERICAN_EXPRESS = "0174"     # American Express
    INVEX = "0176"                # Invex
    BANCREA = "0177"              # Bancrea
    AJUSTES_POR_COMPENSACION = "0188"  # Ajustes por compensación
    OPCIONES_EMPRESARIALES = "0189"    # Opciones Empresariales
    AGROBANK = "0501"             # AgroBank
    BANCAFECI = "0502"            # BancaFeci
    ACCENDO_BANCO = "0503"        # Accendo Banco
    INVERCAP = "0506"             # Invercap
    BANCO_SIMPLES = "0640"        # Banco Simples
    FUNDACIÓN_DONDÉ_BANCO = "0642"  # Fundación Dondé Banco
    BANCATÍN = "0645"             # Bancatín
    BANCO_AUTOFIN = "0646"        # BancoAutofin
    INTERCAM_BANCO = "0648"       # Intercam Banco
    ACTINVER = "0649"             # Actinver
    BANCO_SABADELL = "0651"       # Banco Sabadell
    INMOBILIARIO = "0652"         # Inmobiliario
    DAVIVIENDA = "0656"           # Davivienda
    BANCO_BANCREA = "0659"        # Banco Bancrea
    BANCO_MONEXCB = "0661"        # Banco Monexcb
    GBM = "0670"                  # GBM
    ZURICH = "0901"               # Zurich
    MAPFRE = "0902"               # Mapfre


class MobilePaymentProvider(str, Enum):
    """Proveedores de pago móvil en Venezuela."""
    BANCO_MOVIL = "banco_movil"        # Banco Móvil (BLOQUE 0100)
    TRANSFERENCIA_DIRECTA = "transferencia"  # Transferencia bancaria
    ZELLE = "zelle"                    # Zelle (US)
    PAYPAL = "paypal"                  # PayPal


class VenezuelanMobilePaymentValidator:
    """Validador específico para pagos móviles venezolanos."""

    # Patrones de validación
    PHONE_PATTERNS = {
        # Formato: +58-XXX-XXXXXXX
        "international": re.compile(r'^\+58\-?[0-9]{3}\-?[0-9]{6,7}$'),
        # Formato: 0414-XXXXXXX, 0424-XXXXXXX, etc.
        "national": re.compile(r'^0[0-9]{3}\-?[0-9]{6,7}$'),
        # Formato: sin guiones
        "minimal": re.compile(r'^[0-9]{10,11}$'),
    }

    # Operadores móviles Venezuela
    MOBILE_OPERATORS = {
        "0414": "Movistar",
        "0424": "Movistar",
        "0412": "Digitel",
        "0416": "Digitel",
        "0426": "Digitel",
        "0410": "ANDES",
        "0430": "ANDES",
        "0440": "ANDES",
    }

    # Cedula patterns
    CEDULA_PATTERNS = {
        "v": re.compile(r'^V-?\d{1,2}\.\d{3}\.\d{3}$|^V\d{1,10}$'),  # Cédula venezolana
        "e": re.compile(r'^E-?\d{1,2}\.\d{3}\.\d{3}$|^E\d{1,10}$'),  # Extranjería
        "j": re.compile(r'^J-?\d{1,2}\.\d{3}\.\d{3}$|^J\d{1,10}$'),  # Jurídica
        "g": re.compile(r'^G-?\d{1,2}\.\d{3}\.\d{3}$|^G\d{1,10}$'),  # Gubernamental
        "p": re.compile(r'^P-?\d{1,2}\.\d{3}\.\d{3}$|^P\d{1,10}$'),  # Pasaporte
    }

    @staticmethod
    def validate_phone_number(phone: str) -> Tuple[bool, Optional[str]]:
        """
        Valida número telefónico venezolano.

        Args:
            phone: Número telefónico a validar

        Returns:
            Tupla (es_válido, mensaje_error)

        Ejemplos válidos:
            - +58-414-1234567
            - 0414-1234567
            - 04141234567
            - +584141234567
        """
        if not phone or not isinstance(phone, str):
            return False, "Número telefónico inválido"

        phone = phone.strip()

        # Intentar con cada patrón
        for pattern_name, pattern in VenezuelanMobilePaymentValidator.PHONE_PATTERNS.items():
            if pattern.match(phone):
                # Extraer el número de operador
                digits = re.sub(r'[^\d]', '', phone)
                if len(digits) == 11 and digits.startswith('58'):
                    digits = digits[2:]  # Remover prefijo +58

                if len(digits) == 10:
                    operator_code = digits[:4]
                    operator = VenezuelanMobilePaymentValidator.MOBILE_OPERATORS.get(
                        operator_code,
                        "Desconocido"
                    )
                    return True, None

                return True, None

        # Intento final: limpiar y validar
        digits_only = re.sub(r'[^\d]', '', phone)
        if digits_only.startswith('58'):
            digits_only = digits_only[2:]

        if len(digits_only) == 10:
            operator_code = digits_only[:4]
            if operator_code in VenezuelanMobilePaymentValidator.MOBILE_OPERATORS:
                return True, None

        return False, "Formato de teléfono no válido. Use: +58-414-1234567 o 0414-1234567"

    @staticmethod
    def validate_cedula(cedula: str) -> Tuple[bool, Optional[str]]:
        """
        Valida cédula de identidad venezolana.

        Args:
            cedula: Número de cédula

        Returns:
            Tupla (es_válido, mensaje_error)

        Formatos válidos:
            - V-12.345.678
            - V12345678
            - E-12.345.678
            - J-12.345.678
        """
        if not cedula or not isinstance(cedula, str):
            return False, "Cédula inválida"

        cedula = cedula.upper().strip()

        # Validar contra patrones
        for tipo, pattern in VenezuelanMobilePaymentValidator.CEDULA_PATTERNS.items():
            if pattern.match(cedula):
                # Validar que el número no sea solo ceros
                digits = re.sub(r'[^\d]', '', cedula)
                if digits and int(digits) > 0:
                    return True, None

        return False, "Formato de cédula no válido. Use: V-12.345.678 o V12345678"

    @staticmethod
    def validate_bank_code(bank_code: str) -> Tuple[bool, Optional[str]]:
        """
        Valida código de banco venezolano.

        Args:
            bank_code: Código de 4 dígitos del banco

        Returns:
            Tupla (es_válido, mensaje_error)
        """
        if not bank_code:
            return False, "Código de banco requerido"

        bank_code = bank_code.strip()

        # Validar que sea de 4 dígitos
        if not re.match(r'^\d{4}$', bank_code):
            return False, "Código de banco debe ser de 4 dígitos (ej: 0102)"

        # Verificar si es un banco conocido
        try:
            VenezuelanBankCode(bank_code)
            return True, None
        except ValueError:
            return False, f"Código de banco '{bank_code}' no reconocido. Consulte el catálogo de bancos."

    @staticmethod
    def validate_transaction_reference(reference: str) -> Tuple[bool, Optional[str]]:
        """
        Valida referencia de transacción de pago móvil.

        Formato esperado: código de 6 o 10 dígitos (generalmente numérico)
        Algunos bancos también aceptan alfanuméricos.

        Args:
            reference: Referencia de la transacción

        Returns:
            Tupla (es_válido, mensaje_error)

        Ejemplos:
            - 123456 (6 dígitos - formato corto)
            - 1234567890 (10 dígitos - formato largo)
            - ABC12345 (alfanumérico)
        """
        if not reference or not isinstance(reference, str):
            return False, "Referencia de transacción requerida"

        reference = reference.strip().upper()

        # Validar longitud (mín 6, máx 20)
        if len(reference) < 6 or len(reference) > 20:
            return False, "Referencia debe tener entre 6 y 20 caracteres"

        # Validar caracteres permitidos (alfanuméricos)
        if not re.match(r'^[A-Z0-9]+$', reference):
            return False, "Referencia solo debe contener letras y números"

        return True, None

    @staticmethod
    def validate_mobile_payment_request(
        phone_number: str,
        cedula: str,
        bank_code: str,
        transaction_reference: str,
        amount: float,
        description: str = None
    ) -> Tuple[bool, dict]:
        """
        Valida una solicitud completa de pago móvil.

        Args:
            phone_number: Número telefónico
            cedula: Cédula de identidad
            bank_code: Código del banco
            transaction_reference: Referencia de transacción
            amount: Monto a pagar
            description: Descripción del pago (opcional)

        Returns:
            Tupla (es_válido, dict_errores_o_datos_validados)
        """
        errors = {}

        # Validar teléfono
        is_valid, error_msg = VenezuelanMobilePaymentValidator.validate_phone_number(phone_number)
        if not is_valid:
            errors['phone_number'] = error_msg

        # Validar cédula
        is_valid, error_msg = VenezuelanMobilePaymentValidator.validate_cedula(cedula)
        if not is_valid:
            errors['cedula'] = error_msg

        # Validar banco
        is_valid, error_msg = VenezuelanMobilePaymentValidator.validate_bank_code(bank_code)
        if not is_valid:
            errors['bank_code'] = error_msg

        # Validar referencia
        is_valid, error_msg = VenezuelanMobilePaymentValidator.validate_transaction_reference(
            transaction_reference
        )
        if not is_valid:
            errors['transaction_reference'] = error_msg

        # Validar monto
        if not isinstance(amount, (int, float)) or amount <= 0:
            errors['amount'] = "Monto debe ser un número positivo"

        if errors:
            return False, errors

        # Si todo es válido, retornar datos normalizados
        phone_normalized = VenezuelanMobilePaymentValidator._normalize_phone(phone_number)
        cedula_normalized = VenezuelanMobilePaymentValidator._normalize_cedula(cedula)

        validated_data = {
            "phone_number": phone_normalized,
            "cedula": cedula_normalized,
            "bank_code": bank_code.strip(),
            "transaction_reference": transaction_reference.strip().upper(),
            "amount": float(amount),
            "description": description.strip() if description else None,
            "mobile_operator": VenezuelanMobilePaymentValidator.MOBILE_OPERATORS.get(
                phone_normalized[:4],
                "Desconocido"
            ),
            "bank_name": VenezuelanBankCode(bank_code.strip()).name.replace('_', ' '),
        }

        return True, validated_data

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Normaliza número telefónico a formato: 04XX-XXXXXXX"""
        digits = re.sub(r'[^\d]', '', phone)
        if digits.startswith('58'):
            digits = digits[2:]
        return f"{digits[:4]}-{digits[4:]}"

    @staticmethod
    def _normalize_cedula(cedula: str) -> str:
        """Normaliza cédula a formato: V-XX.XXX.XXX"""
        cedula_upper = cedula.upper().strip()
        tipo = cedula_upper[0]
        numbers = re.sub(r'[^\d]', '', cedula_upper)

        # Formatear con puntos
        if len(numbers) <= 3:
            return f"{tipo}-{numbers}"
        elif len(numbers) <= 6:
            return f"{tipo}-{numbers[:2]}.{numbers[2:]}"
        else:
            return f"{tipo}-{numbers[:2]}.{numbers[2:5]}.{numbers[5:]}"

    @staticmethod
    def get_valid_banks_list() -> list:
        """
        Retorna lista de bancos válidos para Banco Móvil.

        Returns:
            Lista de dicts con código y nombre del banco
        """
        banks = []
        for bank_code in VenezuelanBankCode:
            banks.append({
                "code": bank_code.value,
                "name": bank_code.name.replace('_', ' '),
                "name_es": bank_code.name.replace('_', ' ')
            })
        return sorted(banks, key=lambda x: x['code'])

    @staticmethod
    def get_valid_mobile_operators() -> dict:
        """
        Retorna operadores móviles válidos.

        Returns:
            Dict con códigos de operador
        """
        return VenezuelanMobilePaymentValidator.MOBILE_OPERATORS.copy()


class PaymentValidator:
    """Validador general de pagos."""

    @staticmethod
    def validate_email(email: str) -> Tuple[bool, Optional[str]]:
        """Valida formato de email."""
        pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if not pattern.match(email):
            return False, "Formato de email inválido"
        return True, None

    @staticmethod
    def validate_amount(amount: float, min_amount: float = 0.01, max_amount: float = 999999999) -> Tuple[bool, Optional[str]]:
        """Valida monto de pago."""
        if not isinstance(amount, (int, float)):
            return False, "Monto debe ser un número"

        if amount < min_amount:
            return False, f"Monto mínimo es {min_amount}"

        if amount > max_amount:
            return False, f"Monto máximo es {max_amount}"

        return True, None

    @staticmethod
    def validate_currency(currency: str) -> Tuple[bool, Optional[str]]:
        """Valida código de moneda."""
        valid_currencies = ['VES', 'USD', 'EUR']
        if currency.upper() not in valid_currencies:
            return False, f"Moneda no válida. Opciones: {', '.join(valid_currencies)}"
        return True, None

    @staticmethod
    def validate_payment_method(method: str, allow_mobile_payment: bool = True) -> Tuple[bool, Optional[str]]:
        """Valida método de pago."""
        valid_methods = [
            'cash', 'card', 'transfer', 'zelle', 'paypal', 'crypto', 'other'
        ]
        if allow_mobile_payment:
            valid_methods.append('mobile_payment')

        if method.lower() not in valid_methods:
            return False, f"Método de pago no válido. Opciones: {', '.join(valid_methods)}"
        return True, None
