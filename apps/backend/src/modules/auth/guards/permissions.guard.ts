import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAction, PermissionResource } from '@prisma/client';
import { RbacService } from '../services/rbac.service';
import { PERMISSIONS_KEY, PermissionRequirement } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract orgId from params, query, or body
    const orgId = request.params.orgId || request.query.orgId || request.body.orgId;

    // Check each required permission
    for (const permission of requiredPermissions) {
      const resourceId = permission.resourceParam ? request.params[permission.resourceParam] : undefined;
      
      const hasPermission = await this.rbacService.checkPermission(
        user.id,
        permission.action,
        permission.resource,
        orgId,
        resourceId,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions: ${permission.action} on ${permission.resource}`,
        );
      }
    }

    return true;
  }
}