import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrgService } from './org.service';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/enums';


@Controller('org')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class OrgController {
  constructor(private orgService: OrgService) {}

  @Get('dashboard')
  async getDashboard(
    @CurrentUser() user: any,
    @Query('timeFilter') timeFilter?: string,
  ) {
    return this.orgService.getDashboard(user.orgId!, timeFilter);
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: any) {
    return this.orgService.getSettings(user.orgId!);
  }

  @Put('settings')
  async updateSettings(
    @CurrentUser() user: any,
    @Body() dto: UpdateOrgSettingsDto,
  ) {
    return this.orgService.updateSettings(user.orgId!, dto);
  }
}
