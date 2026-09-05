export const AVAILABLE_ROLES = [
  'pireps',
  'fleet',
  'routes',
  'events',
  'users',
  'multipliers',
  'ranks',
  'typeratings',
] as const;

export type Role = (typeof AVAILABLE_ROLES)[number];

export const ADMIN_ROLE = 'admin' as const;
export const OWNER_ROLE = 'owner' as const;

export const ALL_ROLES = [OWNER_ROLE, ADMIN_ROLE, ...AVAILABLE_ROLES] as const;
export const ASSIGNABLE_ROLES = [ADMIN_ROLE, ...AVAILABLE_ROLES] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function parseRolesField(roleField: string | null): string[] {
  if (!roleField) {
    return [];
  }
  const trimmed = roleField.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }
  return [trimmed];
}

export function stringifyRoles(rolesArr: string[]): string {
  if (rolesArr.length === 0) {
    return '';
  }
  return `[${rolesArr.join(', ')}]`;
}

export function normalizeRoles(userRoles: string[] | string | null): string[] {
  if (!userRoles) {
    return [];
  }

  if (Array.isArray(userRoles)) {
    return userRoles;
  }

  if (typeof userRoles === 'string') {
    return parseRolesField(userRoles);
  }

  return [];
}

export function hasRequiredRole(
  userRoles: string[] | string | null,
  requiredRoles: string[]
): boolean {
  if (!userRoles) {
    return false;
  }

  const normalizedRoles = normalizeRoles(userRoles);

  // Admin/Owner have access to everything
  if (
    normalizedRoles.includes(ADMIN_ROLE) ||
    normalizedRoles.includes(OWNER_ROLE)
  ) {
    return true;
  }

  // Check if user has any of the required roles
  return requiredRoles.some((role) => normalizedRoles.includes(role));
}

export function addRoleToUser(
  existingRoles: string[],
  roleToAdd: Role
): string[] {
  if (existingRoles.includes(roleToAdd)) {
    return existingRoles;
  }
  return [...existingRoles, roleToAdd];
}

export function removeRoleFromUser(
  existingRoles: string[],
  roleToRemove: string
): string[] {
  return existingRoles.filter((role) => role !== roleToRemove);
}

export function getAllRolesForOwner(): string[] {
  return [OWNER_ROLE];
}

export function clearAllRoles(): string[] {
  return [];
}

export function isOwnerOrAdmin(userRoles: string[] | string | null): boolean {
  const normalizedRoles = normalizeRoles(userRoles);
  return (
    normalizedRoles.includes(OWNER_ROLE) || normalizedRoles.includes(ADMIN_ROLE)
  );
}
