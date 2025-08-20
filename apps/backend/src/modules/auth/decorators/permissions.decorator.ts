import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';

export interface PermissionRequirement {
  action: PermissionAction;
  resource: PermissionResource;
  resourceParam?: string | undefined; // Parameter name to extract resource ID from request
}

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Convenience decorators for common permission patterns
export const CanCreate = (resource: PermissionResource, resourceParam?: string | undefined) =>
  RequirePermissions({ action: PermissionAction.CREATE, resource, ...(resourceParam && { resourceParam }) });

export const CanRead = (resource: PermissionResource, resourceParam?: string | undefined) =>
  RequirePermissions({ action: PermissionAction.READ, resource, ...(resourceParam && { resourceParam }) });

export const CanUpdate = (resource: PermissionResource, resourceParam?: string | undefined) =>
  RequirePermissions({ action: PermissionAction.UPDATE, resource, ...(resourceParam && { resourceParam }) });

export const CanDelete = (resource: PermissionResource, resourceParam?: string | undefined) =>
  RequirePermissions({ action: PermissionAction.DELETE, resource, ...(resourceParam && { resourceParam }) });

export const CanDeploy = (resource: PermissionResource, resourceParam?: string | undefined) =>
  RequirePermissions({ action: PermissionAction.DEPLOY, resource, ...(resourceParam && { resourceParam }) });

export const CanDestroy = (resource: PermissionResource, resourceParam?: string | undefined) =>
  RequirePermissions({ action: PermissionAction.DESTROY, resource, ...(resourceParam && { resourceParam }) });

export const CanAdmin = (resource: PermissionResource, resourceParam?: string | undefined) =>
  RequirePermissions({ action: PermissionAction.ADMIN, resource, ...(resourceParam && { resourceParam }) });