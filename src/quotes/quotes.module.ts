import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AgentQuotesController,
  OrgQuotesController,
  OrgApprovalsController,
} from './quotes.controller';
import { QuotesService } from './quotes.service';
import { Quote } from '../entities/quote.entity';
import { Service } from '../entities/service.entity';
import { Organization } from '../entities/organization.entity';
import { AgentMarkupConfig } from '../entities/agent-markup-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, Service, Organization, AgentMarkupConfig]),
  ],
  controllers: [
    AgentQuotesController,
    OrgQuotesController,
    OrgApprovalsController,
  ],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
