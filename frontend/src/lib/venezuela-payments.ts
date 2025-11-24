/**
 * Venezuelan Payment Methods and Banks Configuration
 * Datos homologados para pagos en Venezuela
 */

export const VENEZUELAN_BANKS = [
  // Bancos Comerciales y Universales de Venezuela
  { code: '0001', name: 'Banco Central de Venezuela (BCV)' },
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0104', name: 'Banco Venezolano de Crédito' },
  { code: '0105', name: 'Banco Mercantil' },
  { code: '0108', name: 'BBVA Provincial' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0115', name: 'Banco Exterior' },
  { code: '0116', name: 'Banco Occidental de Descuento (BOD)' },
  { code: '0128', name: 'Banco Caroní' },
  { code: '0134', name: 'Banesco' },
  { code: '0137', name: 'Banco Sofitasa' },
  { code: '0138', name: 'Banco Plaza' },
  { code: '0146', name: 'Bangente' },
  { code: '0151', name: 'BFC Banco Fondo Común' },
  { code: '0156', name: '100% Banco' },
  { code: '0157', name: 'DelSur Banco' },
  { code: '0163', name: 'Banco del Tesoro' },
  { code: '0166', name: 'Banco Agrícola de Venezuela' },
  { code: '0168', name: 'Bancrecer' },
  { code: '0169', name: 'Mi Banco' },
  { code: '0171', name: 'Banco Activo' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0173', name: 'Banco Internacional de Desarrollo' },
  { code: '0174', name: 'Banplus' },
  { code: '0175', name: 'Banco Bicentenario' },
  { code: '0176', name: 'Banco Espirito Santo' },
  { code: '0177', name: 'BANFANB' },
  { code: '0191', name: 'Banco Nacional de Crédito (BNC)' },
  // Instituciones financieras especiales
  { code: '0601', name: 'Instituto de Crédito Agrícola y Pecuario' },
  { code: '1061', name: 'Venezolano de Crédito' },
];

export const MOBILE_OPERATORS = [
  { code: '0414', name: 'Movistar (0414)' },
  { code: '0424', name: 'Movistar (0424)' },
  { code: '0412', name: 'Digitel (0412)' },
  { code: '0416', name: 'Digitel (0416)' },
  { code: '0426', name: 'Digitel (0426)' },
  { code: '0410', name: 'ANDES (0410)' },
  { code: '0430', name: 'ANDES (0430)' },
  { code: '0440', name: 'ANDES (0440)' },
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

  // Formatos válidos: 0414, 0424, 0412, 0416, 0426, 0410, 0430, 0440
  const operators: Record<string, string> = {
    '0414': 'Movistar',
    '0424': 'Movistar',
    '0412': 'Digitel',
    '0416': 'Digitel',
    '0426': 'Digitel',
    '0410': 'ANDES',
    '0430': 'ANDES',
    '0440': 'ANDES',
  };

  const prefix = cleaned.substring(0, 4);

  if (!operators[prefix]) {
    return {
      valid: false,
      message: 'Prefijo telefónico no válido (use 0414, 0424, 0412, 0416, 0426, 0410, 0430 o 0440)',
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
