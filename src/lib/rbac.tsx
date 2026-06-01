import React from 'react';

export type Role = 'SDR' | 'Account Executive' | 'Sales Manager' | 'Customer Success' | 'Org Admin' | 'Viewer' | 'Integration User';
export type Action = 'read' | 'write' | 'delete' | 'export';
export type Module = 'leads' | 'deals' | 'forecasts' | 'contracts' | 'settings' | 'users' | 'audit_logs' | 'analytics' | 'outreach';

export interface Permission {
  role: Role;
  module: Module;
  actions: Action[];
}

export const permissions: Permission[] = [
  // SDR
  { role: 'SDR', module: 'leads', actions: ['read', 'write', 'export'] },
  { role: 'SDR', module: 'deals', actions: ['read'] },
  { role: 'SDR', module: 'outreach', actions: ['read', 'write'] },
  { role: 'SDR', module: 'analytics', actions: ['read'] },

  // Account Executive
  { role: 'Account Executive', module: 'leads', actions: ['read', 'write'] },
  { role: 'Account Executive', module: 'deals', actions: ['read', 'write'] },
  { role: 'Account Executive', module: 'contracts', actions: ['read', 'write'] },
  { role: 'Account Executive', module: 'outreach', actions: ['read', 'write'] },
  { role: 'Account Executive', module: 'analytics', actions: ['read'] },

  // Sales Manager
  { role: 'Sales Manager', module: 'leads', actions: ['read', 'write', 'delete', 'export'] },
  { role: 'Sales Manager', module: 'deals', actions: ['read', 'write', 'delete', 'export'] },
  { role: 'Sales Manager', module: 'forecasts', actions: ['read', 'write'] },
  { role: 'Sales Manager', module: 'contracts', actions: ['read', 'write'] },
  { role: 'Sales Manager', module: 'outreach', actions: ['read', 'write'] },
  { role: 'Sales Manager', module: 'analytics', actions: ['read', 'export'] },
  
  // Customer Success
  { role: 'Customer Success', module: 'leads', actions: ['read', 'write'] },
  { role: 'Customer Success', module: 'deals', actions: ['read'] },
  { role: 'Customer Success', module: 'contracts', actions: ['read'] },
  { role: 'Customer Success', module: 'analytics', actions: ['read'] },

  // Org Admin (Full access essentially)
  { role: 'Org Admin', module: 'leads', actions: ['read', 'write', 'delete', 'export'] },
  { role: 'Org Admin', module: 'deals', actions: ['read', 'write', 'delete', 'export'] },
  { role: 'Org Admin', module: 'forecasts', actions: ['read', 'write', 'delete', 'export'] },
  { role: 'Org Admin', module: 'contracts', actions: ['read', 'write', 'delete', 'export'] },
  { role: 'Org Admin', module: 'settings', actions: ['read', 'write', 'delete'] },
  { role: 'Org Admin', module: 'users', actions: ['read', 'write', 'delete'] },
  { role: 'Org Admin', module: 'audit_logs', actions: ['read', 'export'] },
  { role: 'Org Admin', module: 'analytics', actions: ['read', 'export'] },
  { role: 'Org Admin', module: 'outreach', actions: ['read', 'write', 'delete', 'export'] },

  // Viewer
  { role: 'Viewer', module: 'leads', actions: ['read'] },
  { role: 'Viewer', module: 'deals', actions: ['read'] },
  { role: 'Viewer', module: 'analytics', actions: ['read'] },
  { role: 'Viewer', module: 'forecasts', actions: ['read'] },

  // Integration User
  { role: 'Integration User', module: 'settings', actions: ['read', 'write'] },
];

export const hasPermission = (role: Role, module: Module, action: Action): boolean => {
  const rolePermissions = permissions.find(p => p.role === role && p.module === module);
  if (!rolePermissions) return false;
  return rolePermissions.actions.includes(action);
};

export const usePermission = (activeRole: Role) => {
  return (module: Module, action: Action) => hasPermission(activeRole, module, action);
};

export const canViewField = (role: Role, field: string): boolean => {
  if (role === 'Org Admin') return true;
  
  const restrictions: Record<string, Role[]> = {
    'dealValue': ['Account Executive', 'Sales Manager', 'Customer Success'], // Viewers and SDRs shouldn't see
    'quotaTargets': ['Sales Manager', 'Account Executive'],
    'systemLogs': [], // Handled by module permissions usually, but explicitly just Admin
    'contractTerms': ['Account Executive', 'Sales Manager', 'Customer Success']
  };

  if (restrictions[field]) {
    return restrictions[field].includes(role);
  }
  return true; // Default visible if not restricted
};

interface FieldGuardProps {
  role: Role;
  field: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FieldGuard: React.FC<FieldGuardProps> = ({ role, field, children, fallback = <span className="text-gray-400 font-mono tracking-widest">••••••</span> }) => {
  if (canViewField(role, field)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};
