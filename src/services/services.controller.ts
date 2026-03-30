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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceFilterDto } from './dto/service-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/enums';


@Controller('org/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query() filters: ServiceFilterDto,
  ) {
    return this.servicesService.list(user.orgId!, filters);
  }

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.create(user.orgId!, dto);
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.getOne(id, user.orgId!);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, user.orgId!, dto);
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.servicesService.delete(id, user.orgId!);
  }
}
