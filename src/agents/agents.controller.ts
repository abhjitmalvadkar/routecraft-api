import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { InviteAgentDto } from './dto/invite-agent.dto';
import { ConfigureMarkupDto } from './dto/configure-markup.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/enums';


// ============================================
// Org Admin routes for managing agents
// ============================================
@Controller('org/agents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class OrgAgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get()
  async listAgents(@CurrentUser() user: any) {
    return this.agentsService.listAgents(user.orgId!);
  }

  @Post('invite')
  async inviteAgent(
    @CurrentUser() user: any,
    @Body() dto: InviteAgentDto,
  ) {
    return this.agentsService.inviteAgent(user.orgId!, dto);
  }

  @Get(':id')
  async getAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.getAgent(id, user.orgId!);
  }

  @Get(':id/markup')
  async getMarkup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.getMarkup(id, user.orgId!);
  }

  @Put(':id/markup')
  async updateMarkup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: ConfigureMarkupDto,
  ) {
    return this.agentsService.updateMarkup(id, user.orgId!, dto.options);
  }

  @Delete(':id')
  async deleteAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.deleteAgent(id, user.orgId!);
  }
}

// ============================================
// Agent's own routes
// ============================================
@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT)
export class AgentSelfController {
  constructor(private agentsService: AgentsService) {}

  @Get('dashboard')
  async dashboard(
    @CurrentUser() user: any,
    @Query('timeFilter') timeFilter?: string,
  ) {
    return this.agentsService.agentDashboard(user.sub, user.orgId!, timeFilter);
  }

  @Get('markup')
  async getMarkup(@CurrentUser() user: any) {
    return this.agentsService.agentMarkup(user.sub);
  }

  @Get('catalog')
  async browseCatalog(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('destinationId') destinationId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.agentsService.browseCatalog(user.orgId!, {
      category,
      destinationId,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get('catalog/alternatives/:serviceId')
  async getAlternatives(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.getAlternatives(serviceId, user.orgId!);
  }

  @Get('catalog/:serviceId')
  async getCatalogService(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: any,
  ) {
    return this.agentsService.getCatalogService(serviceId, user.orgId!);
  }
}
