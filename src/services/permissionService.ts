import { User, Permission } from '@/types';

export const hasPermission = (user: User | null | undefined, permission: Permission): boolean => {
  if (!user) return false;
  
  // Check effectivePermissions (calculated with groups) first, fall back to direct permissions
  // Cast to any to handle potential type mismatches during migration, though we updated User type
  const perms = (user as any).effectivePermissions || user.permissions || [];
  
  return perms.includes('*') || perms.includes(permission);
};

export const hasAnyPermission = (user: User | null | undefined, permissions: Permission[]): boolean => {
  if (!user) return false;
  
  const userPerms = (user as any).effectivePermissions || user.permissions || [];
  
  if (userPerms.includes('*')) return true;
  return permissions.some(p => userPerms.includes(p));
};