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
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { SetPricingDto } from './dto/pricing.dto';
import { SendQuoteDto } from './dto/send-quote.dto';
import { ReworkQuoteDto } from './dto/rework-quote.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/enums';


// ============================================
// Agent quote routes
// ============================================
@Controller('agent/quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT)
export class AgentQuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  async createQuote(
    @CurrentUser() user: any,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quotesService.createQuote(dto, user);
  }

  @Get()
  async listQuotes(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('timeFilter') timeFilter?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quotesService.listQuotes(user, {
      status,
      timeFilter,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get(':id')
  async getQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.quotesService.getQuote(id, user);
  }

  @Put(':id/itinerary')
  async updateItinerary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('itinerary') itinerary: any[],
  ) {
    return this.quotesService.updateItinerary(id, itinerary, user);
  }

  @Post(':id/pricing')
  async setPricing(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: SetPricingDto,
  ) {
    return this.quotesService.setPricing(id, dto, user);
  }

  @Post(':id/send')
  async sendQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: SendQuoteDto,
  ) {
    return this.quotesService.sendQuote(
      id,
      dto.email,
      dto.personalNote,
      user,
    );
  }

  @Get(':id/download')
  async downloadQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.quotesService.downloadQuote(id, user);
  }

  @Post(':id/resend')
  async resendQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: SendQuoteDto,
  ) {
    return this.quotesService.resendQuote(id, dto.email, user);
  }

  @Delete(':id')
  async deleteQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.quotesService.deleteQuote(id, user);
  }
}

// ============================================
// Org Admin / Super Admin quote routes
// ============================================
@Controller('org/quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class OrgQuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  async createQuote(
    @CurrentUser() user: any,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quotesService.createQuote(dto, user);
  }

  @Get()
  async listQuotes(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('timeFilter') timeFilter?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quotesService.listQuotes(user, {
      status,
      timeFilter,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get(':id')
  async getQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.quotesService.getQuote(id, user);
  }

  @Patch(':id/approve')
  async approveQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.quotesService.approveQuote(id, user);
  }

  @Patch(':id/rework')
  async reworkQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: ReworkQuoteDto,
  ) {
    return this.quotesService.reworkQuote(id, dto.comment, user);
  }

  @Post(':id/pricing')
  async setPricing(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: SetPricingDto,
  ) {
    return this.quotesService.setPricing(id, dto, user);
  }

  @Post(':id/send')
  async sendQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: SendQuoteDto,
  ) {
    return this.quotesService.sendQuote(
      id,
      dto.email,
      dto.personalNote,
      user,
    );
  }

  @Get(':id/download')
  async downloadQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.quotesService.downloadQuote(id, user);
  }
}

// ============================================
// Org Approvals route
// ============================================
@Controller('org/approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class OrgApprovalsController {
  constructor(private quotesService: QuotesService) {}

  @Get()
  async listPendingApprovals(@CurrentUser() user: any) {
    return this.quotesService.listPendingApprovals(user);
  }
}
