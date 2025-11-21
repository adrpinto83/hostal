/**
 * Sistema de Roles y Permisos del Hostal
 *
 * Este archivo define los permisos para cada rol de usuario.
 * Los permisos NO pueden ser modificados por los usuarios - están protegidos en el backend.
 * Solo el administrador puede crear, editar y eliminar usuarios.
 */

export interface RolePermissions {
  description: string;
  permissions: {
    [key: string]: {
      label: string;
      description: string;
      enabled: boolean;
    };
  };
}

export const ROLES_DEFINITION: { [key: string]: RolePermissions } = {
  admin: {
    description: "Administrador - Propietario del Sistema",
    permissions: {
      users_management: {
        label: "Gestión de Usuarios",
        description: "Crear, editar, eliminar y aprobar usuarios",
        enabled: true,
      },
      system_settings: {
        label: "Configuración del Sistema",
        description: "Acceso a configuración global del hostal",
        enabled: true,
      },
      financial_reports: {
        label: "Reportes Financieros",
        description: "Ver reportes de ingresos, gastos y ganancias",
        enabled: true,
      },
      view_all_reports: {
        label: "Ver Todos los Reportes",
        description: "Acceso a reportes completos del sistema",
        enabled: true,
      },
      reservations: {
        label: "Gestión de Reservas",
        description: "Crear, editar y eliminar reservas",
        enabled: true,
      },
      check_in_out: {
        label: "Check-in/Check-out",
        description: "Procesar entrada y salida de huéspedes",
        enabled: true,
      },
      staff_management: {
        label: "Gestión de Staff",
        description: "Ver y gestionar información del personal",
        enabled: true,
      },
      assign_roles: {
        label: "Asignar Roles",
        description: "Asignar roles a usuarios aprobados",
        enabled: true,
      },
    },
  },

  recepcionista: {
    description: "Recepcionista - Personal de Frente",
    permissions: {
      users_management: {
        label: "Gestión de Usuarios",
        description: "Crear, editar y eliminar usuarios",
        enabled: false,
      },
      system_settings: {
        label: "Configuración del Sistema",
        description: "Acceso a configuración global",
        enabled: false,
      },
      financial_reports: {
        label: "Reportes Financieros",
        description: "Ver reportes financieros",
        enabled: false,
      },
      view_all_reports: {
        label: "Ver Todos los Reportes",
        description: "Acceso a todos los reportes",
        enabled: false,
      },
      reservations: {
        label: "Gestión de Reservas",
        description: "Crear, editar y gestionar reservas de huéspedes",
        enabled: true,
      },
      check_in_out: {
        label: "Check-in/Check-out",
        description: "Procesar entrada y salida de huéspedes",
        enabled: true,
      },
      process_payments: {
        label: "Procesar Pagos",
        description: "Registrar pagos y generar comprobantes",
        enabled: true,
      },
      view_guests: {
        label: "Ver Información de Huéspedes",
        description: "Acceso a datos de huéspedes actuales",
        enabled: true,
      },
      staff_management: {
        label: "Gestión de Staff",
        description: "Ver información del personal",
        enabled: false,
      },
      assign_roles: {
        label: "Asignar Roles",
        description: "Asignar roles a usuarios",
        enabled: false,
      },
    },
  },

  gerente: {
    description: "Gerente - Supervisor",
    permissions: {
      users_management: {
        label: "Gestión de Usuarios",
        description: "Crear, editar y eliminar usuarios",
        enabled: false,
      },
      system_settings: {
        label: "Configuración del Sistema",
        description: "Acceso a configuración global",
        enabled: false,
      },
      financial_reports: {
        label: "Reportes Financieros",
        description: "Ver reportes financieros",
        enabled: true,
      },
      view_all_reports: {
        label: "Ver Todos los Reportes",
        description: "Acceso a todos los reportes",
        enabled: true,
      },
      reservations: {
        label: "Gestión de Reservas",
        description: "Crear, editar y gestionar reservas",
        enabled: true,
      },
      check_in_out: {
        label: "Check-in/Check-out",
        description: "Procesar entrada y salida de huéspedes",
        enabled: true,
      },
      process_payments: {
        label: "Procesar Pagos",
        description: "Registrar pagos y generar comprobantes",
        enabled: true,
      },
      view_guests: {
        label: "Ver Información de Huéspedes",
        description: "Acceso a datos de huéspedes",
        enabled: true,
      },
      maintenance: {
        label: "Reportar Mantenimiento",
        description: "Gestionar solicitudes de mantenimiento",
        enabled: true,
      },
      staff_management: {
        label: "Gestión de Staff",
        description: "Ver y supervisar información del personal",
        enabled: true,
      },
      assign_roles: {
        label: "Asignar Roles",
        description: "Asignar roles a usuarios",
        enabled: false,
      },
    },
  },

  mantenimiento: {
    description: "Mantenimiento - Personal Técnico",
    permissions: {
      users_management: {
        label: "Gestión de Usuarios",
        description: "Crear, editar y eliminar usuarios",
        enabled: false,
      },
      system_settings: {
        label: "Configuración del Sistema",
        description: "Acceso a configuración global",
        enabled: false,
      },
      financial_reports: {
        label: "Reportes Financieros",
        description: "Ver reportes financieros",
        enabled: false,
      },
      view_all_reports: {
        label: "Ver Todos los Reportes",
        description: "Acceso a todos los reportes",
        enabled: false,
      },
      reservations: {
        label: "Gestión de Reservas",
        description: "Crear y editar reservas",
        enabled: false,
      },
      check_in_out: {
        label: "Check-in/Check-out",
        description: "Procesar entrada y salida",
        enabled: false,
      },
      maintenance: {
        label: "Reportar Mantenimiento",
        description: "Crear y reportar solicitudes de mantenimiento",
        enabled: true,
      },
      view_rooms: {
        label: "Ver Habitaciones",
        description: "Ver disponibilidad y estado de habitaciones",
        enabled: true,
      },
      staff_management: {
        label: "Gestión de Staff",
        description: "Ver información del personal",
        enabled: false,
      },
      assign_roles: {
        label: "Asignar Roles",
        description: "Asignar roles a usuarios",
        enabled: false,
      },
    },
  },

  staff: {
    description: "Personal - Empleado General",
    permissions: {
      users_management: {
        label: "Gestión de Usuarios",
        description: "Crear, editar y eliminar usuarios",
        enabled: false,
      },
      system_settings: {
        label: "Configuración del Sistema",
        description: "Acceso a configuración global",
        enabled: false,
      },
      financial_reports: {
        label: "Reportes Financieros",
        description: "Ver reportes financieros",
        enabled: false,
      },
      view_all_reports: {
        label: "Ver Todos los Reportes",
        description: "Acceso a todos los reportes",
        enabled: false,
      },
      reservations: {
        label: "Gestión de Reservas",
        description: "Crear y editar reservas",
        enabled: false,
      },
      check_in_out: {
        label: "Check-in/Check-out",
        description: "Procesar entrada y salida",
        enabled: false,
      },
      maintenance: {
        label: "Reportar Mantenimiento",
        description: "Crear y reportar solicitudes de mantenimiento",
        enabled: true,
      },
      view_rooms: {
        label: "Ver Habitaciones",
        description: "Ver disponibilidad y estado de habitaciones",
        enabled: true,
      },
      staff_management: {
        label: "Gestión de Staff",
        description: "Ver información del personal",
        enabled: false,
      },
      assign_roles: {
        label: "Asignar Roles",
        description: "Asignar roles a usuarios",
        enabled: false,
      },
    },
  },
};

export function getPermissions(role: string): { [key: string]: boolean } {
  const roleData = ROLES_DEFINITION[role];
  if (!roleData) return {};

  const permissions: { [key: string]: boolean } = {};
  Object.entries(roleData.permissions).forEach(([key, value]) => {
    permissions[key] = value.enabled;
  });
  return permissions;
}

export function hasPermission(
  userRole: string,
  permission: string
): boolean {
  const roleData = ROLES_DEFINITION[userRole];
  if (!roleData) return false;
  return roleData.permissions[permission]?.enabled || false;
}

export function getAvailableRoles() {
  return [
    {
      value: "admin",
      label: "Administrador",
      description: "Propietario del sistema con acceso total",
    },
    {
      value: "gerente",
      label: "Gerente",
      description: "Supervisor con reportes y gestión",
    },
    {
      value: "recepcionista",
      label: "Recepcionista",
      description: "Personal de frente que gestiona reservas y check-in",
    },
    {
      value: "mantenimiento",
      label: "Mantenimiento",
      description: "Personal técnico para mantenimiento",
    },
    {
      value: "staff",
      label: "Personal",
      description: "Empleado general con permisos limitados",
    },
  ];
}
