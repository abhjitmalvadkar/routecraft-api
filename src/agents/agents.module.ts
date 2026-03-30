import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgAgentsController, AgentSelfController } from './agents.controller';
import { AgentsService } from './agents.service';
import { User } from '../entities/user.entity';
import { Quote } from '../entities/quote.entity';
import { Service } from '../entities/service.entity';
import { AgentMarkupConfig } from '../entities/agent-markup-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Quote, Service, AgentMarkupConfig]),
  ],
  controllers: [OrgAgentsController, AgentSelfController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
