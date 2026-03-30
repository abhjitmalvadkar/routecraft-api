import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { Quote } from '../entities/quote.entity';
import { Service } from '../entities/service.entity';
import { AgentMarkupConfig } from '../entities/agent-markup-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      User,
      Quote,
      Service,
      AgentMarkupConfig,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
