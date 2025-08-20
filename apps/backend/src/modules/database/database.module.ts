import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    {
      provide: 'DATABASE_CONNECTION_POOL_SIZE',
      useFactory: (configService: ConfigService) => {
        return configService.get('DATABASE_CONNECTION_POOL_SIZE', 10);
      },
      inject: [ConfigService],
    },
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}
