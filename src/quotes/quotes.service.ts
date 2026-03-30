import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Quote } from '../entities/quote.entity';
import { Service } from '../entities/service.entity';
import { Organization } from '../entities/organization.entity';
import { AgentMarkupConfig } from '../entities/agent-markup-config.entity';
import { Role, QuoteStatus } from '../entities/enums';
import { JwtPayload } from '../common/types';
import { applyTimeFilter } from '../common/utils/time-filter.util';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private quoteRepo: Repository<Quote>,
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(AgentMarkupConfig)
    private markupConfigRepo: Repository<AgentMarkupConfig>,
  ) {}

  private toNumber(val: any): number | null {
    if (val === null || val === undefined) return null;
    return Number(val);
  }

  private formatQuote(quote: Quote) {
    return {
      ...quote,
      vendorTotal: this.toNumber(quote.vendorTotal),
      markupValue: this.toNumber(quote.markupValue),
      clientTotal: this.toNumber(quote.clientTotal),
      createdBy: quote.createdBy
        ? {
            id: quote.createdBy.id,
            name: quote.createdBy.name,
            role: quote.createdBy.role,
          }
        : undefined,
    };
  }

  private async recalculateVendorTotal(
    orgId: string,
    itinerary: any[],
  ): Promise<number> {
    let vendorTotal = 0;

    for (const day of itinerary) {
      if (!day.services || !Array.isArray(day.services)) continue;
      for (const svc of day.services) {
        if (svc.serviceId) {
          const dbService = await this.serviceRepo.findOne({
            where: {
              id: svc.serviceId,
              orgId,
              isActive: true,
              deletedAt: IsNull(),
            },
          });
          if (dbService) {
            const rate = Number(dbService.vendorRate);
            const quantity = svc.quantity || 1;
            svc.vendorRate = rate;
            svc.subtotal = rate * quantity;
          }
        }
        vendorTotal += svc.subtotal || 0;
      }
    }

    return vendorTotal;
  }

  async createQuote(data: any, user: JwtPayload) {
    const orgId = user.orgId || data.orgId;

    let vendorTotal = data.vendorTotal || 0;
    if (data.itinerary && Array.isArray(data.itinerary)) {
      vendorTotal = await this.recalculateVendorTotal(orgId, data.itinerary);
    }

    const quote = this.quoteRepo.create({
      orgId,
      createdById: user.sub,
      name: data.name,
      status: QuoteStatus.DRAFT,
      bookingType: data.bookingType,
      adultsCount: data.adultsCount,
      childrenCount: data.childrenCount,
      travelStartDate: data.travelStartDate,
      travelEndDate: data.travelEndDate,
      destinations: data.destinations || [],
      itinerary: data.itinerary || [],
      vendorTotal,
      aiConversation: data.aiConversation || [],
    });

    const saved = await this.quoteRepo.save(quote);

    const full = await this.quoteRepo.findOne({
      where: { id: saved.id },
      relations: ['createdBy'],
    });

    return this.formatQuote(full!);
  }

  async updateItinerary(quoteId: string, itinerary: any[], user: JwtPayload) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
      relations: ['createdBy'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    // Access check
    if (
      user.role === Role.AGENT &&
      quote.createdById !== user.sub
    ) {
      throw new ForbiddenException('Access denied');
    }
    if (
      user.role === Role.ORG_ADMIN &&
      quote.orgId !== user.orgId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Status check
    if (
      quote.status !== QuoteStatus.DRAFT &&
      quote.status !== QuoteStatus.REWORK
    ) {
      throw new BadRequestException(
        'Quote can only be edited in DRAFT or REWORK status',
      );
    }

    const vendorTotal = await this.recalculateVendorTotal(
      quote.orgId,
      itinerary,
    );

    quote.itinerary = itinerary;
    quote.vendorTotal = vendorTotal;

    const saved = await this.quoteRepo.save(quote);
    return this.formatQuote(saved);
  }

  async setPricing(quoteId: string, pricingData: any, user: JwtPayload) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
      relations: ['createdBy'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    // Access check
    if (user.role === Role.AGENT && quote.createdById !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === Role.ORG_ADMIN && quote.orgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    const vendorTotal = Number(quote.vendorTotal) || 0;

    quote.markupType = pricingData.markupType;
    quote.markupValue = pricingData.markupValue;
    quote.pricingFormat = pricingData.pricingFormat;

    // Calculate client total
    if (pricingData.markupType === 'percentage') {
      quote.clientTotal =
        vendorTotal * (1 + pricingData.markupValue / 100);
    } else {
      // custom — markupValue is the agent-set total
      quote.clientTotal = pricingData.markupValue;
    }

    // Set validity
    if (pricingData.validUntil) {
      const validDate = new Date(pricingData.validUntil);
      const now = new Date();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 7);

      if (validDate > maxDate) {
        quote.validUntil = maxDate;
      } else {
        quote.validUntil = validDate;
      }
    } else {
      // Use org default
      const org = await this.orgRepo.findOne({
        where: { id: quote.orgId },
      });
      const days = org?.defaultQuoteValidity || 3;
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + days);
      quote.validUntil = validDate;
    }

    // Determine if approval is needed
    let approvalRequired = false;

    if (user.role === Role.AGENT) {
      if (pricingData.markupType === 'custom') {
        approvalRequired = true;
      } else {
        // Check agent's markup config for flagged status
        const config = await this.markupConfigRepo.findOne({
          where: { agentId: user.sub },
        });

        if (config && config.options) {
          const option = config.options.find(
            (o: any) => o.percentage === pricingData.markupValue,
          );
          if (option && option.flagged) {
            approvalRequired = true;
          }
          // If percentage not in options, it's "Custom" -> flagged
          if (!option) {
            approvalRequired = true;
          }
        }
      }
    }

    if (approvalRequired) {
      quote.status = QuoteStatus.PENDING_APPROVAL;
    } else {
      quote.status = QuoteStatus.READY_FOR_PRICING;
    }

    const saved = await this.quoteRepo.save(quote);
    return { ...this.formatQuote(saved), approvalRequired };
  }

  async getQuote(quoteId: string, user: JwtPayload) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
      relations: ['createdBy'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    // Access check
    if (user.role === Role.AGENT && quote.createdById !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === Role.ORG_ADMIN && quote.orgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    return this.formatQuote(quote);
  }

  async listQuotes(
    user: JwtPayload,
    filters: {
      status?: string;
      timeFilter?: string;
      page?: number;
      limit?: number;
      orgId?: string;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const qb = this.quoteRepo
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.createdBy', 'createdBy')
      .where('quote.deletedAt IS NULL');

    if (user.role === Role.AGENT) {
      qb.andWhere('quote.createdById = :userId', { userId: user.sub });
    } else if (user.role === Role.ORG_ADMIN) {
      qb.andWhere('quote.orgId = :orgId', { orgId: user.orgId });
    } else if (user.role === Role.SUPER_ADMIN && filters.orgId) {
      qb.andWhere('quote.orgId = :orgId', { orgId: filters.orgId });
    }

    if (filters.status) {
      qb.andWhere('quote.status = :status', { status: filters.status });
    }

    applyTimeFilter(qb, 'quote', filters.timeFilter);

    const total = await qb.getCount();
    const quotes = await qb
      .orderBy('quote.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: quotes.map((q) => this.formatQuote(q)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listPendingApprovals(user: JwtPayload) {
    const qb = this.quoteRepo
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.createdBy', 'createdBy')
      .where('quote.deletedAt IS NULL')
      .andWhere('quote.status = :status', {
        status: QuoteStatus.PENDING_APPROVAL,
      });

    if (user.role === Role.ORG_ADMIN) {
      qb.andWhere('quote.orgId = :orgId', { orgId: user.orgId });
    }

    const quotes = await qb
      .orderBy('quote.createdAt', 'DESC')
      .getMany();

    return quotes.map((q) => this.formatQuote(q));
  }

  async approveQuote(quoteId: string, user: JwtPayload) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
      relations: ['createdBy'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    if (user.role === Role.ORG_ADMIN && quote.orgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    if (quote.status !== QuoteStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Quote is not pending approval');
    }

    quote.status = QuoteStatus.APPROVED;
    const saved = await this.quoteRepo.save(quote);
    return this.formatQuote(saved);
  }

  async reworkQuote(quoteId: string, comment: string, user: JwtPayload) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
      relations: ['createdBy'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    if (user.role === Role.ORG_ADMIN && quote.orgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    if (quote.status !== QuoteStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Quote is not pending approval');
    }

    const reworkEntry = {
      from: user.email,
      role: user.role,
      comment,
      timestamp: new Date().toISOString(),
    };

    const reworkComments = Array.isArray(quote.reworkComments)
      ? [...quote.reworkComments, reworkEntry]
      : [reworkEntry];

    quote.reworkComments = reworkComments;
    quote.status = QuoteStatus.REWORK;

    const saved = await this.quoteRepo.save(quote);
    return this.formatQuote(saved);
  }

  async sendQuote(
    quoteId: string,
    recipientEmail: string,
    personalNote: string | undefined,
    user: JwtPayload,
  ) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    // Access check
    if (user.role === Role.AGENT && quote.createdById !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === Role.ORG_ADMIN && quote.orgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    if (
      quote.status !== QuoteStatus.APPROVED &&
      quote.status !== QuoteStatus.READY_FOR_PRICING
    ) {
      throw new BadRequestException('Quote is not ready to be sent');
    }

    // TODO: Generate PDF using PdfService
    // TODO: Send email using EmailService

    quote.status = QuoteStatus.SENT;
    await this.quoteRepo.save(quote);

    return { message: 'Quote sent successfully', recipientEmail };
  }

  async downloadQuote(quoteId: string, user: JwtPayload) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    // Access check
    if (user.role === Role.AGENT && quote.createdById !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === Role.ORG_ADMIN && quote.orgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    // TODO: Generate PDF using PdfService

    if (quote.status !== QuoteStatus.SENT) {
      quote.status = QuoteStatus.DOWNLOADED;
      await this.quoteRepo.save(quote);
    }

    // Return placeholder until PdfService is implemented
    return {
      message: 'PDF generation not yet implemented',
      quote: this.formatQuote(quote),
    };
  }

  async deleteQuote(quoteId: string, user: JwtPayload) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    if (user.role === Role.AGENT && quote.createdById !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === Role.ORG_ADMIN && quote.orgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    quote.deletedAt = new Date();
    await this.quoteRepo.save(quote);

    return { message: 'Quote deleted successfully' };
  }

  async resendQuote(
    quoteId: string,
    newEmail: string,
    user: JwtPayload,
  ) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, deletedAt: IsNull() },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    if (user.role === Role.AGENT && quote.createdById !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === Role.ORG_ADMIN && quote.orgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.DOWNLOADED) {
      throw new BadRequestException('Quote has not been sent yet');
    }

    // TODO: Generate fresh PDF using PdfService
    // TODO: Send email to newEmail using EmailService

    return { message: 'Quote resent successfully', recipientEmail: newEmail };
  }
}
