import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DestinationsService } from './destinations.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/enums';


@Controller('org/destinations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class DestinationsController {
  constructor(private destinationsService: DestinationsService) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return this.destinationsService.list(user.orgId!);
  }

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateDestinationDto,
  ) {
    return this.destinationsService.create(user.orgId!, dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateDestinationDto,
  ) {
    return this.destinationsService.update(id, user.orgId!, dto);
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.destinationsService.delete(id, user.orgId!);
  }
}
