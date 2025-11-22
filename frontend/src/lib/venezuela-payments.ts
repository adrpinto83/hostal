/**
 * Venezuelan Payment Methods and Banks Configuration
 * Datos homologados para pagos en Venezuela
 */

export const VENEZUELAN_BANKS = [
  // Bancos Universales
  { code: '0102', name: 'Banco de Venezuela, S.A.' },
  { code: '0104', name: 'Banco Venezolano de Crédito, S.A.' },
  { code: '0105', name: 'Banco Mercantil, C.A.' },
  { code: '0106', name: 'Banco del Caribe, C.A.' },
  { code: '0108', name: 'Banco Provincial, S.A.' },
  { code: '0110', name: 'Banco de Crédito e Inversiones' },
  { code: '0112', name: 'Banco Lagunilla, S.A.' },
  { code: '0114', name: 'Banco Autofín, S.A.' },
  { code: '0115', name: 'Banco Única, S.A.' },
  { code: '0116', name: 'BBVA Banco Francés, C.A.' },
  { code: '0117', name: 'Banco Actinver, C.A.' },
  { code: '0119', name: 'Banco Schloss, S.A.' },
  { code: '0120', name: 'Banco del Tesoro, S.A.' },
  { code: '0121', name: 'Banco Occidental de Descuento' },
  { code: '0122', name: 'Banco Italcambio, C.A.' },
  { code: '0123', name: 'Banco Ápice, S.A.' },
  { code: '0124', name: 'Banco Finterra, C.A.' },
  { code: '0125', name: 'Banco Pluss, C.A.' },
  { code: '0126', name: 'Banco Banesco, S.A.' },
  { code: '0127', name: 'Banco Bicentenario, C.A.' },
  { code: '0128', name: 'Banco Hipotecario Federal' },
  { code: '0129', name: 'Banco Sofimex, C.A.' },
  { code: '0130', name: 'Banco Fondo Común, C.A.' },
  { code: '0131', name: 'Banco Futuro, C.A.' },
  { code: '0132', name: 'Banco Metropolitano, C.A.' },
  { code: '0133', name: 'Banco Activa, C.A.' },
  { code: '0134', name: 'Banco Latinoamericano de Exportaciones' },
  { code: '0135', name: 'Banco Mercantil del Norte' },
  { code: '0136', name: 'Banco de Inversiones de Venezuela' },
  { code: '0137', name: 'BNDES Banco de Desarrollo Empresarial' },
  { code: '0138', name: 'Banco FOMPED' },
  { code: '0139', name: 'Banco Macro, C.A.' },
  { code: '0140', name: 'Banco Interamericano' },
  { code: '0142', name: 'Banco América Central' },
  { code: '0143', name: 'Banco del Puente' },
  { code: '0145', name: 'Banco Carrefour' },
  { code: '0147', name: 'Banco Anzoátegui' },
  { code: '0148', name: 'Banco Lara' },
  { code: '0149', name: 'Banco Mérida' },
  { code: '0150', name: 'Banco Trujillo' },

  // Bancos de Segundo Piso
  { code: '0156', name: 'Banco de Desarrollo de la Mujer' },
  { code: '0157', name: 'Banco Nacional de Crédito Agrícola' },
  { code: '0158', name: 'Banco del Caribe de Venezuela' },
  { code: '0159', name: 'Banco de la República de Venezuela' },
  { code: '0160', name: 'Banco de Crédito para la Construcción' },

  // Instituciones de Pago Electrónico
  { code: '0168', name: 'Banesco Provisiones, C.A.' },
  { code: '0169', name: 'Misión Vivienda Venezuela, C.A.' },
  { code: '0170', name: 'Banco de Inversiones de Venezuela' },
  { code: '0171', name: 'Empresa Operadora de Valores' },
  { code: '0172', name: 'Banco Bicentenario de Inversión' },
  { code: '0173', name: 'Valores Analíticos, C.A.' },
];

export const MOBILE_OPERATORS = [
  { code: 'movistar', name: 'Movistar (0414, 0424)' },
  { code: 'digitel', name: 'Digitel (0412)' },
  { code: 'movilnet', name: 'Movilnet (0416, 0426)' },
];

export const ACCOUNT_TYPES = [
  { code: 'checking', name: 'Cuenta Corriente' },
  { code: 'savings', name: 'Cuenta de Ahorros' },
  { code: 'investment', name: 'Cuenta de Inversión' },
];

export const PAYMENT_METHODS_VENEZUELA = [
  {
    code: 'cash',
    name: 'Efectivo',
    label: 'Pago en Efectivo',
    description: 'Pago directo en efectivo',
    requiredFields: [],
  },
  {
    code: 'transfer',
    name: 'Transferencia Bancaria',
    label: 'Transferencia Bancaria',
    description: 'Transferencia a cuenta bancaria',
    requiredFields: ['bank_code', 'account_number', 'account_type'],
  },
  {
    code: 'mobile_payment',
    name: 'Pago Móvil',
    label: 'Pago Móvil Interbancario',
    description: 'Pago a través de operador móvil',
    requiredFields: ['mobile_operator', 'phone_number', 'cedula'],
  },
  {
    code: 'card',
    name: 'Tarjeta Débito/Crédito',
    label: 'Pago con Tarjeta',
    description: 'Pago con tarjeta de débito o crédito',
    requiredFields: ['card_last_digits', 'card_type'],
  },
  {
    code: 'zelle',
    name: 'Zelle',
    label: 'Transferencia Zelle',
    description: 'Transferencia por Zelle',
    requiredFields: ['phone_email'],
  },
  {
    code: 'crypto',
    name: 'Criptomonedas',
    label: 'Pago en Criptomonedas',
    description: 'Pago en Bitcoin, Ethereum u otras criptos',
    requiredFields: ['crypto_address'],
  },
  {
    code: 'other',
    name: 'Otro',
    label: 'Otro Método',
    description: 'Otro método de pago',
    requiredFields: [],
  },
];

export const CARD_TYPES = [
  { code: 'debit', name: 'Tarjeta Débito' },
  { code: 'credit', name: 'Tarjeta Crédito' },
];

/**
 * Validación de teléfono venezolano
 */
export function validateVenezuelanPhone(phone: string): { valid: boolean; operator?: string; message: string } {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return { valid: false, message: 'El teléfono debe tener 10 u 11 dígitos' };
  }

  // Formatos válidos: 0414..., 0424..., 0412..., 0416..., 0426...
  const operators: Record<string, string> = {
    '0414': 'Movistar',
    '0424': 'Movistar',
    '0412': 'Digitel',
    '0416': 'Movilnet',
    '0426': 'Movilnet',
  };

  const prefix = cleaned.substring(0, 4);

  if (!operators[prefix]) {
    return {
      valid: false,
      message: 'Prefijo telefónico no válido (use 0414, 0424, 0412, 0416 o 0426)',
    };
  }

  return {
    valid: true,
    operator: operators[prefix],
    message: `Operador detectado: ${operators[prefix]}`,
  };
}

/**
 * Validación de cédula venezolana
 */
export function validateVenezuelanCedula(cedula: string): { valid: boolean; type?: string; message: string } {
  const cleaned = cedula.replace(/\D/g, '');

  if (cleaned.length < 6 || cleaned.length > 8) {
    return { valid: false, message: 'La cédula debe tener entre 6 y 8 dígitos' };
  }

  const typeMap: Record<string, string> = {
    'V': 'Venezolano',
    'E': 'Extranjero',
    'J': 'Jurídica',
    'G': 'Gobierno',
    'P': 'Pasaporte',
  };

  const firstChar = cedula.charAt(0).toUpperCase();
  const type = typeMap[firstChar];

  if (!type) {
    return {
      valid: false,
      message: 'Tipo de cédula no válido. Use V, E, J, G o P',
    };
  }

  return {
    valid: true,
    type,
    message: `Tipo de cédula: ${type}`,
  };
}

/**
 * Formato de teléfono venezolano a estándar
 */
export function formatVenezuelanPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `0${cleaned}`;
  }
  return cleaned;
}

/**
 * Obtener banco por código
 */
export function getBankByCode(code: string): { code: string; name: string } | undefined {
  return VENEZUELAN_BANKS.find((bank) => bank.code === code);
}

/**
 * Obtener método de pago por código
 */
export function getPaymentMethodByCode(code: string): (typeof PAYMENT_METHODS_VENEZUELA)[0] | undefined {
  return PAYMENT_METHODS_VENEZUELA.find((method) => method.code === code);
}
