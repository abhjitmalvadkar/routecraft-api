import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { Quote } from '../entities/quote.entity';
import { Service } from '../entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User, Quote, Service])],
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}
