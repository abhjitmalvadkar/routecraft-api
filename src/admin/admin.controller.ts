import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { UpdateOrgDto } from './dto/update-org.dto';
import { CreateOrgAdminDto } from './dto/create-org-admin.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../entities/enums';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard(@Query('timeFilter') timeFilter?: string) {
    return this.adminService.getDashboard(timeFilter);
  }

  @Get('orgs')
  async listOrgs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('timeFilter') timeFilter?: string,
  ) {
    return this.adminService.listOrgs(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
      timeFilter,
    );
  }

  @Post('orgs')
  async createOrg(@Body() dto: CreateOrgDto) {
    return this.adminService.createOrg(dto);
  }

  @Get('orgs/:id')
  async getOrg(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getOrg(id);
  }

  @Put('orgs/:id')
  async updateOrg(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrgDto,
  ) {
    return this.adminService.updateOrg(id, dto);
  }

  @Patch('orgs/:id/status')
  async updateOrgStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.updateOrgStatus(id, isActive);
  }

  @Delete('orgs/:id')
  async deleteOrg(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteOrg(id);
  }

  @Post('orgs/:orgId/admin')
  async createOrgAdmin(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateOrgAdminDto,
  ) {
    return this.adminService.createOrgAdmin({ ...dto, orgId });
  }

  @Post('orgs/:orgId/invite')
  async inviteUser(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: InviteUserDto,
  ) {
    return this.adminService.inviteUser(orgId, dto);
  }

  @Patch('orgs/:orgId/users/:userId/status')
  async updateUserStatus(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.updateUserStatus(orgId, userId, isActive);
  }

  @Delete('orgs/:orgId/users/:userId')
  async deleteUser(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.adminService.deleteUser(orgId, userId);
  }

  @Post('orgs/:orgId/remind')
  async remindOrg(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.adminService.remindOrg(orgId);
  }

  @Get('orgs/:orgId/users')
  async getOrgUsers(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('timeFilter') timeFilter?: string,
  ) {
    return this.adminService.getOrgUsers(
      orgId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      timeFilter,
    );
  }

  @Get('orgs/:orgId/users/:userId')
  async getUserDashboard(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.adminService.getUserDashboard(orgId, userId);
  }

  @Get('orgs/:orgId/quotes/:quoteId')
  async getQuoteDetail(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
  ) {
    return this.adminService.getQuoteDetail(orgId, quoteId);
  }
}
