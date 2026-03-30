import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Quote } from '../entities/quote.entity';
import { Service } from '../entities/service.entity';
import { AgentMarkupConfig } from '../entities/agent-markup-config.entity';
import { Role, QuoteStatus, ServiceCategory } from '../entities/enums';
import { applyTimeFilter } from '../common/utils/time-filter.util';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Quote)
    private quoteRepo: Repository<Quote>,
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
    @InjectRepository(AgentMarkupConfig)
    private markupConfigRepo: Repository<AgentMarkupConfig>,
  ) {}

  private generateTempPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;

    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < 10; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  private sanitizeUser(user: User) {
    const { password, deletedAt, ...rest } = user;
    return rest;
  }

  // === Org Admin managing agents ===

  async listAgents(orgId: string) {
    const agents = await this.userRepo.find({
      where: { orgId, role: Role.AGENT, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    const enriched = await Promise.all(
      agents.map(async (agent) => {
        const totalQuotes = await this.quoteRepo.count({
          where: { createdById: agent.id, deletedAt: IsNull() },
        });

        const lastQuote = await this.quoteRepo.findOne({
          where: { createdById: agent.id, deletedAt: IsNull() },
          order: { createdAt: 'DESC' },
        });

        return {
          ...this.sanitizeUser(agent),
          _count: { quotes: totalQuotes },
          lastActivity: lastQuote?.createdAt || agent.createdAt,
        };
      }),
    );

    return enriched;
  }

  async getAgent(id: string, orgId: string) {
    const agent = await this.userRepo.findOne({
      where: { id, orgId, role: Role.AGENT, deletedAt: IsNull() },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    const totalQuotes = await this.quoteRepo.count({
      where: { createdById: id, deletedAt: IsNull() },
    });

    const recentQuotes = await this.quoteRepo.find({
      where: { createdById: id, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const quotesByStatus = await this.quoteRepo
      .createQueryBuilder('quote')
      .select('quote.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('quote.createdById = :id', { id })
      .andWhere('quote.deletedAt IS NULL')
      .groupBy('quote.status')
      .getRawMany();

    return {
      ...this.sanitizeUser(agent),
      stats: {
        totalQuotes,
        quotesByStatus: quotesByStatus.reduce(
          (acc, item) => ({ ...acc, [item.status]: parseInt(item.count, 10) }),
          {},
        ),
      },
      recentQuotes: recentQuotes.map((q) => ({
        ...q,
        vendorTotal: q.vendorTotal ? Number(q.vendorTotal) : null,
        clientTotal: q.clientTotal ? Number(q.clientTotal) : null,
        markupValue: q.markupValue ? Number(q.markupValue) : null,
      })),
    };
  }

  async inviteAgent(orgId: string, data: { name: string; email: string }) {
    const existingEmail = await this.userRepo.findOne({
      where: { email: data.email, deletedAt: IsNull() },
    });
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: Role.AGENT,
      orgId,
      mustChangePassword: true,
    });

    const saved = await this.userRepo.save(user);

    // Create default markup config
    const markupConfig = this.markupConfigRepo.create({
      agentId: saved.id,
      options: [
        { percentage: 10, flagged: false },
        { percentage: 15, flagged: false },
        { percentage: 20, flagged: false },
      ],
    });
    await this.markupConfigRepo.save(markupConfig);

    return { user: this.sanitizeUser(saved), tempPassword };
  }

  async deleteAgent(id: string, orgId: string) {
    const agent = await this.userRepo.findOne({
      where: { id, orgId, role: Role.AGENT, deletedAt: IsNull() },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    agent.deletedAt = new Date();
    await this.userRepo.save(agent);

    return { message: 'Agent deleted successfully' };
  }

  async getMarkup(agentId: string, orgId: string) {
    const agent = await this.userRepo.findOne({
      where: { id: agentId, orgId, role: Role.AGENT, deletedAt: IsNull() },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    const config = await this.markupConfigRepo.findOne({
      where: { agentId },
    });

    return {
      options: config?.options || [],
    };
  }

  async updateMarkup(
    agentId: string,
    orgId: string,
    options: Array<{ percentage: number; flagged: boolean }>,
  ) {
    const agent = await this.userRepo.findOne({
      where: { id: agentId, orgId, role: Role.AGENT, deletedAt: IsNull() },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    // Validate no duplicate percentages
    const percentages = options.map((o) => o.percentage);
    if (new Set(percentages).size !== percentages.length) {
      throw new BadRequestException('Duplicate percentages not allowed');
    }

    // Validate all percentages > 0
    if (options.some((o) => o.percentage <= 0)) {
      throw new BadRequestException('Percentages must be greater than 0');
    }

    let config = await this.markupConfigRepo.findOne({
      where: { agentId },
    });

    if (config) {
      config.options = options;
      return this.markupConfigRepo.save(config);
    } else {
      config = this.markupConfigRepo.create({ agentId, options });
      return this.markupConfigRepo.save(config);
    }
  }

  // === Agent's own routes ===

  async agentDashboard(userId: string, orgId: string, timeFilter?: string) {
    const quoteQb = this.quoteRepo
      .createQueryBuilder('quote')
      .where('quote.createdById = :userId', { userId })
      .andWhere('quote.deletedAt IS NULL');

    applyTimeFilter(quoteQb, 'quote', timeFilter);

    const totalQuotes = await quoteQb.getCount();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const quotesThisMonth = await this.quoteRepo
      .createQueryBuilder('quote')
      .where('quote.createdById = :userId', { userId })
      .andWhere('quote.deletedAt IS NULL')
      .andWhere('quote.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    const quotesSent = await this.quoteRepo.count({
      where: {
        createdById: userId,
        status: QuoteStatus.SENT,
        deletedAt: IsNull(),
      },
    });

    const quotesPendingApproval = await this.quoteRepo.count({
      where: {
        createdById: userId,
        status: QuoteStatus.PENDING_APPROVAL,
        deletedAt: IsNull(),
      },
    });

    const recentQuotes = await this.quoteRepo.find({
      where: { createdById: userId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalQuotes,
      quotesThisMonth,
      quotesSent,
      quotesPendingApproval,
      recentQuotes: recentQuotes.map((q) => ({
        ...q,
        vendorTotal: q.vendorTotal ? Number(q.vendorTotal) : null,
        clientTotal: q.clientTotal ? Number(q.clientTotal) : null,
        markupValue: q.markupValue ? Number(q.markupValue) : null,
      })),
    };
  }

  async agentMarkup(userId: string) {
    const config = await this.markupConfigRepo.findOne({
      where: { agentId: userId },
    });

    const options = config?.options || [];

    // Add "Custom" as always-flagged option (not stored)
    return {
      options: [
        ...options,
        { percentage: null, label: 'Custom', flagged: true },
      ],
    };
  }

  async browseCatalog(
    orgId: string,
    filters: {
      category?: string;
      destinationId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const qb = this.serviceRepo
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.destination', 'destination')
      .where('service.orgId = :orgId', { orgId })
      .andWhere('service.deletedAt IS NULL')
      .andWhere('service.isActive = :active', { active: true });

    if (filters.category) {
      qb.andWhere('service.category = :category', {
        category: filters.category,
      });
    }

    if (filters.destinationId) {
      qb.andWhere('service.destinationId = :destinationId', {
        destinationId: filters.destinationId,
      });
    }

    if (filters.search) {
      qb.andWhere('service.name ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    const total = await qb.getCount();
    const services = await qb
      .orderBy('service.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: services.map((s) => ({
        ...s,
        vendorRate: Number(s.vendorRate),
        destination: s.destination
          ? { id: s.destination.id, name: s.destination.name }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCatalogService(serviceId: string, orgId: string) {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId, orgId, deletedAt: IsNull(), isActive: true },
      relations: ['destination'],
    });
    if (!service) throw new NotFoundException('Service not found');

    return {
      ...service,
      vendorRate: Number(service.vendorRate),
    };
  }

  async getAlternatives(serviceId: string, orgId: string) {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId, orgId, deletedAt: IsNull() },
    });
    if (!service) throw new NotFoundException('Service not found');

    const qb = this.serviceRepo
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.destination', 'destination')
      .where('service.orgId = :orgId', { orgId })
      .andWhere('service.deletedAt IS NULL')
      .andWhere('service.isActive = :active', { active: true })
      .andWhere('service.id != :serviceId', { serviceId })
      .andWhere('service.destinationId = :destId', {
        destId: service.destinationId,
      });

    if (service.category === ServiceCategory.HOTELS) {
      // For hotels: all hotels in same destination, no price filter
      qb.andWhere('service.category = :category', {
        category: ServiceCategory.HOTELS,
      });
    } else {
      // For others: same category, same destination, +/-20% price range
      const vendorRate = Number(service.vendorRate);
      const minRate = vendorRate * 0.8;
      const maxRate = vendorRate * 1.2;

      qb.andWhere('service.category = :category', {
        category: service.category,
      })
        .andWhere('CAST(service.vendorRate AS numeric) >= :minRate', { minRate })
        .andWhere('CAST(service.vendorRate AS numeric) <= :maxRate', { maxRate });
    }

    const alternatives = await qb.getMany();

    return alternatives.map((s) => ({
      ...s,
      vendorRate: Number(s.vendorRate),
      destination: s.destination
        ? { id: s.destination.id, name: s.destination.name }
        : null,
    }));
  }
}
