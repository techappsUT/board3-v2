import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PermissionAction, PermissionResource } from '@prisma/client';

import { RbacService } from './rbac.service';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../cache/redis.service';

describe('RbacService', () => {
  let service: RbacService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockRole = {
    id: 'role-id',
    name: 'Developer',
    description: 'Developer role',
    permissions: [
      { action: PermissionAction.CREATE, resource: PermissionResource.DESIGN, scope: null },
      { action: PermissionAction.READ, resource: PermissionResource.DESIGN, scope: null },
      { action: PermissionAction.UPDATE, resource: PermissionResource.DESIGN, scope: null },
    ],
  };

  const mockOrgMember = {
    id: 'member-id',
    userId: 'user-id',
    orgId: 'org-id',
    roleId: 'role-id',
    isActive: true,
    role: mockRole,
  };

  const mockPrismaService = {
    organizationMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('should return true for user with required permission', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(mockOrgMember);

      const result = await service.checkPermission(
        'user-id',
        PermissionAction.CREATE,
        PermissionResource.DESIGN,
        'org-id',
      );

      expect(result).toBe(true);
    });

    it('should return false for user without required permission', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(mockOrgMember);

      const result = await service.checkPermission(
        'user-id',
        PermissionAction.DELETE,
        PermissionResource.DESIGN,
        'org-id',
      );

      expect(result).toBe(false);
    });

    it('should return true for user with ADMIN permission', async () => {
      const adminRole = {
        ...mockRole,
        permissions: [
          { action: PermissionAction.ADMIN, resource: PermissionResource.ORGANIZATION, scope: null },
        ],
      };
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findFirst.mockResolvedValue({
        ...mockOrgMember,
        role: adminRole,
      });

      const result = await service.checkPermission(
        'user-id',
        PermissionAction.DELETE,
        PermissionResource.DESIGN,
        'org-id',
      );

      expect(result).toBe(true);
    });

    it('should use cached permissions when available', async () => {
      const cachedPermissions = JSON.stringify([
        { action: PermissionAction.READ, resource: PermissionResource.DESIGN },
      ]);
      mockRedisService.get.mockResolvedValue(cachedPermissions);

      const result = await service.checkPermission(
        'user-id',
        PermissionAction.READ,
        PermissionResource.DESIGN,
        'org-id',
      );

      expect(result).toBe(true);
      expect(mockPrismaService.organizationMember.findFirst).not.toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis error'));
      mockPrismaService.organizationMember.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await service.checkPermission(
        'user-id',
        PermissionAction.READ,
        PermissionResource.DESIGN,
        'org-id',
      );

      expect(result).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('should not throw for user with permission', async () => {
      jest.spyOn(service, 'checkPermission').mockResolvedValue(true);

      await expect(
        service.requirePermission('user-id', PermissionAction.READ, PermissionResource.DESIGN, 'org-id'),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException for user without permission', async () => {
      jest.spyOn(service, 'checkPermission').mockResolvedValue(false);

      await expect(
        service.requirePermission('user-id', PermissionAction.READ, PermissionResource.DESIGN, 'org-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserRole', () => {
    it('should return user role with permissions', async () => {
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(mockOrgMember);

      const result = await service.getUserRole('user-id', 'org-id');

      expect(result).toEqual({
        id: 'role-id',
        name: 'Developer',
        description: 'Developer role',
        permissions: mockRole.permissions,
      });
    });

    it('should return null for user without role', async () => {
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);

      const result = await service.getUserRole('user-id', 'org-id');

      expect(result).toBeNull();
    });
  });

  describe('assignRole', () => {
    it('should successfully assign role to user', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.organizationMember.upsert.mockResolvedValue(mockOrgMember);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      await expect(service.assignRole('user-id', 'org-id', 'role-id', 'admin-id')).resolves.toBeUndefined();

      expect(mockPrismaService.organizationMember.upsert).toHaveBeenCalledWith({
        where: { userId_orgId: { userId: 'user-id', orgId: 'org-id' } },
        update: { roleId: 'role-id', isActive: true },
        create: { userId: 'user-id', orgId: 'org-id', roleId: 'role-id', isActive: true },
      });
    });

    it('should throw NotFoundException for non-existent role', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.assignRole('user-id', 'org-id', 'role-id', 'admin-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createRole', () => {
    const roleData = {
      name: 'Custom Role',
      description: 'Custom role description',
      permissions: [
        { action: PermissionAction.READ, resource: PermissionResource.DESIGN },
        { action: PermissionAction.CREATE, resource: PermissionResource.DESIGN },
      ],
    };

    it('should successfully create a new role', async () => {
      const createdRole = {
        id: 'new-role-id',
        name: roleData.name,
        description: roleData.description,
        orgId: 'org-id',
        permissions: roleData.permissions,
      };

      mockPrismaService.role.create.mockResolvedValue(createdRole);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      const result = await service.createRole(
        'org-id',
        roleData.name,
        roleData.description,
        roleData.permissions,
        'admin-id',
      );

      expect(result).toEqual({
        id: 'new-role-id',
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
      });

      expect(mockPrismaService.role.create).toHaveBeenCalledWith({
        data: {
          name: roleData.name,
          description: roleData.description,
          orgId: 'org-id',
          permissions: {
            create: roleData.permissions.map(p => ({
              action: p.action,
              resource: p.resource,
              scope: undefined,
            })),
          },
        },
        include: { permissions: true },
      });
    });
  });

  describe('updateRole', () => {
    const updates = {
      name: 'Updated Role',
      description: 'Updated description',
      permissions: [
        { action: PermissionAction.READ, resource: PermissionResource.TEMPLATE },
      ],
    };

    it('should successfully update role', async () => {
      const existingRole = { ...mockRole, isSystem: false };
      const updatedRole = { ...existingRole, ...updates };

      mockPrismaService.role.findFirst.mockResolvedValue(existingRole);
      mockPrismaService.role.update.mockResolvedValue(updatedRole);
      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      const result = await service.updateRole('role-id', 'org-id', updates, 'admin-id');

      expect(result.name).toBe(updates.name);
      expect(result.description).toBe(updates.description);
    });

    it('should throw NotFoundException for system role', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.updateRole('role-id', 'org-id', updates, 'admin-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteRole', () => {
    it('should successfully delete role not in use', async () => {
      const role = { ...mockRole, isSystem: false };
      mockPrismaService.role.findFirst.mockResolvedValue(role);
      mockPrismaService.organizationMember.count.mockResolvedValue(0);
      mockPrismaService.role.delete.mockResolvedValue(role);
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'audit-id' });

      await expect(service.deleteRole('role-id', 'org-id', 'admin-id')).resolves.toBeUndefined();

      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({ where: { id: 'role-id' } });
    });

    it('should throw ForbiddenException for role in use', async () => {
      const role = { ...mockRole, isSystem: false };
      mockPrismaService.role.findFirst.mockResolvedValue(role);
      mockPrismaService.organizationMember.count.mockResolvedValue(2);

      await expect(service.deleteRole('role-id', 'org-id', 'admin-id')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for system role', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.deleteRole('role-id', 'org-id', 'admin-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('initializeDefaultRoles', () => {
    it('should create default roles for organization', async () => {
      mockPrismaService.role.create
        .mockResolvedValueOnce({ id: 'admin-role-id', name: 'Admin' })
        .mockResolvedValueOnce({ id: 'dev-role-id', name: 'Developer' })
        .mockResolvedValueOnce({ id: 'viewer-role-id', name: 'Viewer' });

      await expect(service.initializeDefaultRoles('org-id')).resolves.toBeUndefined();

      expect(mockPrismaService.role.create).toHaveBeenCalledTimes(3);
    });
  });
});