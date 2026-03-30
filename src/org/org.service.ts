import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { Quote } from '../entities/quote.entity';
import { Service } from '../entities/service.entity';
import { Role, QuoteStatus } from '../entities/enums';
import { applyTimeFilter } from '../common/utils/time-filter.util';

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Quote)
    private quoteRepo: Repository<Quote>,
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
  ) {}

  async getDashboard(orgId: string, timeFilter?: string) {
    const totalAgents = await this.userRepo.count({
      where: { orgId, role: Role.AGENT, deletedAt: IsNull() },
    });

    const quoteQb = this.quoteRepo
      .createQueryBuilder('quote')
      .where('quote.orgId = :orgId', { orgId })
      .andWhere('quote.deletedAt IS NULL');

    applyTimeFilter(quoteQb, 'quote', timeFilter);

    const totalQuotes = await quoteQb.getCount();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const quotesThisMonth = await this.quoteRepo
      .createQueryBuilder('quote')
      .where('quote.orgId = :orgId', { orgId })
      .andWhere('quote.deletedAt IS NULL')
      .andWhere('quote.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    const servicesCount = await this.serviceRepo.count({
      where: { orgId, deletedAt: IsNull() },
    });

    const pendingApprovals = await this.quoteRepo.count({
      where: {
        orgId,
        status: QuoteStatus.PENDING_APPROVAL,
        deletedAt: IsNull(),
      },
    });

    const recentQuotes = await this.quoteRepo.find({
      where: { orgId, deletedAt: IsNull() },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const agents = await this.userRepo.find({
      where: { orgId, role: Role.AGENT, deletedAt: IsNull() },
      select: ['id', 'name', 'email', 'isActive', 'createdAt'],
    });

    return {
      totalAgents,
      totalQuotes,
      quotesThisMonth,
      servicesCount,
      pendingApprovals,
      recentQuotes: recentQuotes.map((q) => ({
        ...q,
        vendorTotal: q.vendorTotal ? Number(q.vendorTotal) : null,
        clientTotal: q.clientTotal ? Number(q.clientTotal) : null,
        markupValue: q.markupValue ? Number(q.markupValue) : null,
        createdBy: q.createdBy
          ? { id: q.createdBy.id, name: q.createdBy.name, role: q.createdBy.role }
          : null,
      })),
      agentList: agents,
    };
  }

  async getSettings(orgId: string) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');

    return {
      name: org.name,
      slug: org.slug,
      description: org.description,
      logo: org.logo,
      defaultQuoteValidity: org.defaultQuoteValidity,
    };
  }

  async updateSettings(
    orgId: string,
    data: { name?: string; slug?: string; defaultQuoteValidity?: number },
  ) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (data.slug && data.slug !== org.slug) {
      const existing = await this.orgRepo.findOne({
        where: { slug: data.slug },
      });
      if (existing && existing.id !== orgId) {
        throw new ConflictException('Slug already taken');
      }
    }

    if (data.name !== undefined) org.name = data.name;
    if (data.slug !== undefined) org.slug = data.slug;
    if (data.defaultQuoteValidity !== undefined)
      org.defaultQuoteValidity = data.defaultQuoteValidity;

    await this.orgRepo.save(org);

    return {
      name: org.name,
      slug: org.slug,
      description: org.description,
      logo: org.logo,
      defaultQuoteValidity: org.defaultQuoteValidity,
    };
  }
}
