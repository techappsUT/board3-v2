import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../cache/redis.service';
import { PermissionAction, PermissionResource } from '@prisma/client';

export interface UserPermission {
  action: PermissionAction;
  resource: PermissionResource;
  scope?: any;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  permissions: UserPermission[];
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);
  private readonly permissionCacheExpiry = 300; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  /**
   * Check if user has permission for a specific action on a resource
   */
  async checkPermission(
    userId: string,
    action: PermissionAction,
    resource: PermissionResource,
    orgId?: string,
    resourceId?: string,
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, orgId);
      
      // Check for exact permission match
      const hasPermission = userPermissions.some(permission => {
        if (permission.action !== action || permission.resource !== resource) {
          return false;
        }

        // Check scope if provided
        if (permission.scope && resourceId) {
          return this.checkScope(permission.scope, resourceId);
        }

        return true;
      });

      // Check for ADMIN permission (grants all permissions)
      const hasAdminPermission = userPermissions.some(permission => 
        permission.action === PermissionAction.ADMIN &&
        (permission.resource === resource || permission.resource === PermissionResource.ORGANIZATION)
      );

      return hasPermission || hasAdminPermission;
    } catch (error) {
      this.logger.error(`Permission check failed for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Require permission or throw ForbiddenException
   */
  async requirePermission(
    userId: string,
    action: PermissionAction,
    resource: PermissionResource,
    orgId?: string,
    resourceId?: string,
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, action, resource, orgId, resourceId);
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `User does not have permission to ${action.toLowerCase()} ${resource.toLowerCase()}`,
      );
    }
  }

  /**
   * Get all permissions for a user in an organization
   */
  async getUserPermissions(userId: string, orgId?: string): Promise<UserPermission[]> {
    const cacheKey = `user_permissions:${userId}:${orgId || 'global'}`;
    
    try {
      // Try to get from cache first
      const cached = await this.redisService.get<string>(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let permissions: UserPermission[] = [];

      if (orgId) {
        // Get organization-specific permissions
        const orgMember = await this.prisma.organizationMember.findFirst({
          where: {
            userId,
            orgId,
            isActive: true,
          },
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        });

        if (orgMember && orgMember.role) {
          permissions = orgMember.role.permissions.map(p => ({
            action: p.action,
            resource: p.resource,
            scope: p.scope,
          }));
        }
      }

      // Cache permissions
      await this.redisService.setex(
        cacheKey,
        this.permissionCacheExpiry,
        JSON.stringify(permissions),
      );

      return permissions;
    } catch (error) {
      this.logger.error(`Failed to get user permissions for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(userId: string, orgId: string): Promise<RoleWithPermissions | null> {
    try {
      const orgMember = await this.prisma.organizationMember.findFirst({
        where: {
          userId,
          orgId,
          isActive: true,
        },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!orgMember || !orgMember.role) {
        return null;
      }

      return {
        id: orgMember.role.id,
        name: orgMember.role.name,
        description: orgMember.role.description,
        permissions: orgMember.role.permissions.map(p => ({
          action: p.action,
          resource: p.resource,
          scope: p.scope,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get user role for ${userId} in org ${orgId}:`, error);
      return null;
    }
  }

  /**
   * Assign role to user in organization
   */
  async assignRole(userId: string, orgId: string, roleId: string, assignedBy: string): Promise<void> {
    try {
      // Check if role exists in the organization
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, orgId },
      });

      if (!role) {
        throw new NotFoundException('Role not found in this organization');
      }

      // Update or create organization member
      await this.prisma.organizationMember.upsert({
        where: {
          userId_orgId: {
            userId,
            orgId,
          },
        },
        update: {
          roleId,
          isActive: true,
        },
        create: {
          userId,
          orgId,
          roleId,
          isActive: true,
        },
      });

      // Clear permission cache
      await this.clearUserPermissionCache(userId, orgId);

      // Log role assignment
      await this.logAuditEvent(assignedBy, 'UPDATE', 'USER', userId, {
        action: 'ROLE_ASSIGNED',
        roleId,
        orgId,
      });

      this.logger.log(`Role ${roleId} assigned to user ${userId} in org ${orgId}`);
    } catch (error) {
      this.logger.error(`Failed to assign role to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Remove user from organization
   */
  async removeFromOrganization(userId: string, orgId: string, removedBy: string): Promise<void> {
    try {
      await this.prisma.organizationMember.updateMany({
        where: { userId, orgId },
        data: { isActive: false },
      });

      // Clear permission cache
      await this.clearUserPermissionCache(userId, orgId);

      // Log removal
      await this.logAuditEvent(removedBy, 'DELETE', 'USER', userId, {
        action: 'REMOVED_FROM_ORG',
        orgId,
      });

      this.logger.log(`User ${userId} removed from org ${orgId}`);
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from org ${orgId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new role in organization
   */
  async createRole(
    orgId: string,
    name: string,
    description: string,
    permissions: Array<{ action: PermissionAction; resource: PermissionResource; scope?: any }>,
    createdBy: string,
  ): Promise<RoleWithPermissions> {
    try {
      const role = await this.prisma.role.create({
        data: {
          name,
          description,
          orgId,
          permissions: {
            create: permissions.map(p => ({
              action: p.action,
              resource: p.resource,
              scope: p.scope,
            })),
          },
        },
        include: {
          permissions: true,
        },
      });

      // Log role creation
      await this.logAuditEvent(createdBy, 'CREATE', 'ROLE', role.id, {
        roleName: name,
        orgId,
        permissions,
      });

      this.logger.log(`Role ${name} created in org ${orgId}`);

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map(p => ({
          action: p.action,
          resource: p.resource,
          scope: p.scope,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to create role ${name} in org ${orgId}:`, error);
      throw error;
    }
  }

  /**
   * Update role permissions
   */
  async updateRole(
    roleId: string,
    orgId: string,
    updates: {
      name?: string;
      description?: string;
      permissions?: Array<{ action: PermissionAction; resource: PermissionResource; scope?: any }>;
    },
    updatedBy: string,
  ): Promise<RoleWithPermissions> {
    try {
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, orgId, isSystem: false },
      });

      if (!role) {
        throw new NotFoundException('Role not found or is a system role');
      }

      // Update role
      const updatedRole = await this.prisma.role.update({
        where: { id: roleId },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.permissions && {
            permissions: {
              deleteMany: {},
              create: updates.permissions.map(p => ({
                action: p.action,
                resource: p.resource,
                scope: p.scope,
              })),
            },
          }),
        },
        include: {
          permissions: true,
        },
      });

      // Clear permission cache for all users with this role
      await this.clearRolePermissionCache(roleId, orgId);

      // Log role update
      await this.logAuditEvent(updatedBy, 'UPDATE', 'ROLE', roleId, {
        updates,
        orgId,
      });

      this.logger.log(`Role ${roleId} updated in org ${orgId}`);

      return {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: updatedRole.permissions.map(p => ({
          action: p.action,
          resource: p.resource,
          scope: p.scope,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to update role ${roleId}:`, error);
      throw error;
    }
  }

  /**
   * Delete role (non-system roles only)
   */
  async deleteRole(roleId: string, orgId: string, deletedBy: string): Promise<void> {
    try {
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, orgId, isSystem: false },
      });

      if (!role) {
        throw new NotFoundException('Role not found or is a system role');
      }

      // Check if role is in use
      const membersCount = await this.prisma.organizationMember.count({
        where: { roleId, isActive: true },
      });

      if (membersCount > 0) {
        throw new ForbiddenException('Cannot delete role that is assigned to users');
      }

      // Delete role (cascade will delete permissions)
      await this.prisma.role.delete({
        where: { id: roleId },
      });

      // Log role deletion
      await this.logAuditEvent(deletedBy, 'DELETE', 'ROLE', roleId, {
        roleName: role.name,
        orgId,
      });

      this.logger.log(`Role ${roleId} deleted from org ${orgId}`);
    } catch (error) {
      this.logger.error(`Failed to delete role ${roleId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize default roles for organization
   */
  async initializeDefaultRoles(orgId: string): Promise<void> {
    try {
      const defaultRoles = [
        {
          name: 'Admin',
          description: 'Full access to all resources',
          isDefault: false,
          isSystem: true,
          permissions: [
            { action: PermissionAction.ADMIN, resource: PermissionResource.ORGANIZATION },
          ],
        },
        {
          name: 'Developer',
          description: 'Can create and manage designs and templates',
          isDefault: true,
          isSystem: true,
          permissions: [
            { action: PermissionAction.CREATE, resource: PermissionResource.DESIGN },
            { action: PermissionAction.READ, resource: PermissionResource.DESIGN },
            { action: PermissionAction.UPDATE, resource: PermissionResource.DESIGN },
            { action: PermissionAction.DELETE, resource: PermissionResource.DESIGN },
            { action: PermissionAction.DEPLOY, resource: PermissionResource.DESIGN },
            { action: PermissionAction.CREATE, resource: PermissionResource.TEMPLATE },
            { action: PermissionAction.READ, resource: PermissionResource.TEMPLATE },
            { action: PermissionAction.UPDATE, resource: PermissionResource.TEMPLATE },
            { action: PermissionAction.DELETE, resource: PermissionResource.TEMPLATE },
            { action: PermissionAction.CREATE, resource: PermissionResource.PIPELINE },
            { action: PermissionAction.READ, resource: PermissionResource.PIPELINE },
            { action: PermissionAction.UPDATE, resource: PermissionResource.PIPELINE },
            { action: PermissionAction.DELETE, resource: PermissionResource.PIPELINE },
            { action: PermissionAction.READ, resource: PermissionResource.STATE },
          ],
        },
        {
          name: 'Viewer',
          description: 'Read-only access to designs and templates',
          isDefault: false,
          isSystem: true,
          permissions: [
            { action: PermissionAction.READ, resource: PermissionResource.DESIGN },
            { action: PermissionAction.READ, resource: PermissionResource.TEMPLATE },
            { action: PermissionAction.READ, resource: PermissionResource.PIPELINE },
            { action: PermissionAction.READ, resource: PermissionResource.STATE },
          ],
        },
      ];

      for (const roleData of defaultRoles) {
        await this.prisma.role.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            orgId,
            isDefault: roleData.isDefault,
            isSystem: roleData.isSystem,
            permissions: {
              create: roleData.permissions,
            },
          },
        });
      }

      this.logger.log(`Default roles initialized for org ${orgId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize default roles for org ${orgId}:`, error);
      throw error;
    }
  }

  private checkScope(scope: any, resourceId: string): boolean {
    // Simple scope checking - can be extended for more complex scenarios
    if (scope.resourceIds && Array.isArray(scope.resourceIds)) {
      return scope.resourceIds.includes(resourceId);
    }
    return true;
  }

  private async clearUserPermissionCache(userId: string, orgId: string): Promise<void> {
    const cacheKey = `user_permissions:${userId}:${orgId}`;
    await this.redisService.del(cacheKey);
  }

  private async clearRolePermissionCache(roleId: string, orgId: string): Promise<void> {
    // Get all users with this role and clear their cache
    const members = await this.prisma.organizationMember.findMany({
      where: { roleId, orgId, isActive: true },
      select: { userId: true },
    });

    for (const member of members) {
      await this.clearUserPermissionCache(member.userId, orgId);
    }
  }

  private async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    details?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: action as any,
          resource,
          resourceId,
          details,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
    }
  }
}