import { User, Permission } from '../types';

export function hasPermission(
  user: User | null | undefined,
  perm: Permission
): boolean {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(perm);
}

export function hasAnyPermission(
  user: User | null | undefined,
  perms: Permission[]
): boolean {
  if (!user || !user.permissions) return false;
  return perms.some(p => user.permissions.includes(p));
}
