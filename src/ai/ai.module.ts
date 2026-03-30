import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { Service } from '../entities/service.entity';
import { Organization } from '../entities/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Service, Organization])],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
