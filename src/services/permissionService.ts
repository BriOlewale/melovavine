import { User, Permission } from '@/types';

export const hasPermission = (user: User | null | undefined, permission: Permission): boolean => {
  if (!user) return false;
  
  const perms = user.effectivePermissions || user.permissions || [];
  
  // Check for wildcard or specific permission
  return perms.includes('*' as Permission) || perms.includes(permission);
};

export const hasAnyPermission = (user: User | null | undefined, permissions: Permission[]): boolean => {
  if (!user) return false;
  
  const userPerms = user.effectivePermissions || user.permissions || [];
  
  if (userPerms.includes('*' as Permission)) return true;
  return permissions.some(p => userPerms.includes(p));
};