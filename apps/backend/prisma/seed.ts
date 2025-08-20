import { PrismaClient, CloudProvider, PermissionAction, PermissionResource } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create default organization
    const defaultOrg = await prisma.organization.upsert({
      where: { slug: 'board3-default' },
      update: {},
      create: {
        name: 'Board3 Default Organization',
        slug: 'board3-default',
        description: 'Default organization for Board3 users',
        domain: 'board3.dev',
        settings: {
          allowPublicTemplates: true,
          defaultCloudProvider: 'AWS',
          maxDesignsPerUser: 100,
          enableDriftDetection: true,
        },
      },
    });

    console.log(`✅ Created default organization: ${defaultOrg.name}`);

    // Create system roles with permissions
    const adminRole = await prisma.role.upsert({
      where: {
        name_orgId: {
          name: 'Admin',
          orgId: defaultOrg.id,
        },
      },
      update: {},
      create: {
        name: 'Admin',
        description: 'Full administrative access to all resources',
        orgId: defaultOrg.id,
        isDefault: false,
        isSystem: true,
      },
    });

    const developerRole = await prisma.role.upsert({
      where: {
        name_orgId: {
          name: 'Developer',
          orgId: defaultOrg.id,
        },
      },
      update: {},
      create: {
        name: 'Developer',
        description: 'Can create and manage designs and templates',
        orgId: defaultOrg.id,
        isDefault: true,
        isSystem: true,
      },
    });

    const viewerRole = await prisma.role.upsert({
      where: {
        name_orgId: {
          name: 'Viewer',
          orgId: defaultOrg.id,
        },
      },
      update: {},
      create: {
        name: 'Viewer',
        description: 'Read-only access to designs and templates',
        orgId: defaultOrg.id,
        isDefault: false,
        isSystem: true,
      },
    });

    console.log('✅ Created system roles');

    // Create admin permissions (all actions on all resources)
    const adminPermissions = [];
    const actions = Object.values(PermissionAction);
    const resources = Object.values(PermissionResource);

    for (const action of actions) {
      for (const resource of resources) {
        adminPermissions.push({
          roleId: adminRole.id,
          action,
          resource,
          scope: { global: true },
        });
      }
    }

    await prisma.permission.createMany({
      data: adminPermissions,
      skipDuplicates: true,
    });

    // Create developer permissions
    const developerPermissions = [
      // Design permissions
      {
        roleId: developerRole.id,
        action: PermissionAction.CREATE,
        resource: PermissionResource.DESIGN,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.READ,
        resource: PermissionResource.DESIGN,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.UPDATE,
        resource: PermissionResource.DESIGN,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.DELETE,
        resource: PermissionResource.DESIGN,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.DEPLOY,
        resource: PermissionResource.DESIGN,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.SHARE,
        resource: PermissionResource.DESIGN,
      },

      // Template permissions
      {
        roleId: developerRole.id,
        action: PermissionAction.CREATE,
        resource: PermissionResource.TEMPLATE,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.READ,
        resource: PermissionResource.TEMPLATE,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.UPDATE,
        resource: PermissionResource.TEMPLATE,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.DELETE,
        resource: PermissionResource.TEMPLATE,
      },

      // Pipeline permissions
      {
        roleId: developerRole.id,
        action: PermissionAction.CREATE,
        resource: PermissionResource.PIPELINE,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.READ,
        resource: PermissionResource.PIPELINE,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.UPDATE,
        resource: PermissionResource.PIPELINE,
      },
      {
        roleId: developerRole.id,
        action: PermissionAction.DELETE,
        resource: PermissionResource.PIPELINE,
      },

      // State permissions
      {
        roleId: developerRole.id,
        action: PermissionAction.READ,
        resource: PermissionResource.STATE,
      },
    ];

    await prisma.permission.createMany({
      data: developerPermissions,
      skipDuplicates: true,
    });

    // Create viewer permissions
    const viewerPermissions = [
      { roleId: viewerRole.id, action: PermissionAction.READ, resource: PermissionResource.DESIGN },
      {
        roleId: viewerRole.id,
        action: PermissionAction.READ,
        resource: PermissionResource.TEMPLATE,
      },
      {
        roleId: viewerRole.id,
        action: PermissionAction.READ,
        resource: PermissionResource.PIPELINE,
      },
      { roleId: viewerRole.id, action: PermissionAction.READ, resource: PermissionResource.STATE },
    ];

    await prisma.permission.createMany({
      data: viewerPermissions,
      skipDuplicates: true,
    });

    console.log('✅ Created role permissions');

    // Create system admin user
    const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@board3.dev' },
      update: {},
      create: {
        email: 'admin@board3.dev',
        username: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        passwordHash: adminPasswordHash,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        timezone: 'UTC',
        preferences: {
          theme: 'dark',
          language: 'en',
          emailNotifications: true,
          browserNotifications: true,
        },
      },
    });

    // Add admin to organization
    await prisma.organizationMember.upsert({
      where: {
        userId_orgId: {
          userId: adminUser.id,
          orgId: defaultOrg.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        orgId: defaultOrg.id,
        roleId: adminRole.id,
      },
    });

    console.log('✅ Created system admin user');

    // Create demo templates
    const templates = [
      {
        name: 'Basic Web Application',
        description: 'A simple web application with compute, storage, and networking components',
        category: 'Web Applications',
        cloudProvider: CloudProvider.AWS,
        canvas: {
          nodes: [
            {
              id: 'ec2-1',
              type: 'compute',
              provider: 'aws_instance',
              position: { x: 100, y: 100 },
              config: {
                instance_type: 't3.micro',
                ami: 'ami-0abcdef1234567890',
              },
            },
            {
              id: 'alb-1',
              type: 'network',
              provider: 'aws_lb',
              position: { x: 300, y: 100 },
              config: {
                load_balancer_type: 'application',
                scheme: 'internet-facing',
              },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'alb-1',
              target: 'ec2-1',
            },
          ],
        },
        terraformCode: `
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name = var.instance_name
  }
}

resource "aws_lb" "main" {
  name               = var.lb_name
  load_balancer_type = "application"
  scheme             = "internet-facing"
  
  subnets = var.subnet_ids

  tags = {
    Name = var.lb_name
  }
}`,
        variables: {
          ami_id: {
            type: 'string',
            description: 'AMI ID for the EC2 instance',
            default: 'ami-0abcdef1234567890',
          },
          instance_type: {
            type: 'string',
            description: 'EC2 instance type',
            default: 't3.micro',
          },
          instance_name: {
            type: 'string',
            description: 'Name tag for the EC2 instance',
            default: 'WebServer',
          },
        },
        tags: {
          category: 'web',
          difficulty: 'beginner',
          cost: 'low',
        },
        isPublic: true,
        creatorId: adminUser.id,
        orgId: defaultOrg.id,
      },
      {
        name: 'Kubernetes Cluster',
        description: 'Complete Kubernetes cluster with monitoring and logging',
        category: 'Container Orchestration',
        cloudProvider: CloudProvider.AWS,
        canvas: {
          nodes: [
            {
              id: 'eks-1',
              type: 'container',
              provider: 'aws_eks_cluster',
              position: { x: 200, y: 150 },
              config: {
                version: '1.27',
                endpoint_config: {
                  private_access: true,
                  public_access: true,
                },
              },
            },
            {
              id: 'nodegroup-1',
              type: 'compute',
              provider: 'aws_eks_node_group',
              position: { x: 200, y: 300 },
              config: {
                instance_types: ['t3.medium'],
                scaling_config: {
                  desired_size: 2,
                  max_size: 4,
                  min_size: 1,
                },
              },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'eks-1',
              target: 'nodegroup-1',
            },
          ],
        },
        terraformCode: `
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = var.endpoint_private_access
    endpoint_public_access  = var.endpoint_public_access
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]

  tags = var.tags
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = var.node_group_name
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = var.instance_types

  scaling_config {
    desired_size = var.desired_capacity
    max_size     = var.max_capacity
    min_size     = var.min_capacity
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = var.tags
}`,
        variables: {
          cluster_name: {
            type: 'string',
            description: 'Name of the EKS cluster',
            default: 'board3-cluster',
          },
          kubernetes_version: {
            type: 'string',
            description: 'Kubernetes version',
            default: '1.27',
          },
          instance_types: {
            type: 'list(string)',
            description: 'EC2 instance types for worker nodes',
            default: ['t3.medium'],
          },
        },
        tags: {
          category: 'kubernetes',
          difficulty: 'intermediate',
          cost: 'medium',
        },
        isPublic: true,
        creatorId: adminUser.id,
        orgId: defaultOrg.id,
      },
    ];

    for (const template of templates) {
      await prisma.template.upsert({
        where: {
          name: template.name,
        },
        update: {},
        create: template,
      });
    }

    console.log('✅ Created demo templates');

    // Create sample design from template
    const webAppTemplate = await prisma.template.findFirst({
      where: { name: 'Basic Web Application' },
    });

    if (webAppTemplate) {
      await prisma.design.upsert({
        where: {
          id: 'sample-design-1',
        },
        update: {},
        create: {
          id: 'sample-design-1',
          name: 'My First Web App',
          description: 'A sample web application created from template',
          cloudProvider: CloudProvider.AWS,
          canvas: webAppTemplate.canvas,
          terraformCode: webAppTemplate.terraformCode,
          variables: webAppTemplate.variables,
          tags: {
            environment: 'development',
            project: 'sample',
          },
          templateId: webAppTemplate.id,
          creatorId: adminUser.id,
          orgId: defaultOrg.id,
        },
      });

      console.log('✅ Created sample design');
    }

    console.log('🎉 Database seeding completed successfully!');

    // Log summary
    const userCount = await prisma.user.count();
    const orgCount = await prisma.organization.count();
    const roleCount = await prisma.role.count();
    const templateCount = await prisma.template.count();
    const designCount = await prisma.design.count();

    console.log('\n📊 Seeding Summary:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Organizations: ${orgCount}`);
    console.log(`   Roles: ${roleCount}`);
    console.log(`   Templates: ${templateCount}`);
    console.log(`   Designs: ${designCount}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
