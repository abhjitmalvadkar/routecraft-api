import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { Quote } from '../entities/quote.entity';
import { Service } from '../entities/service.entity';
import { AgentMarkupConfig } from '../entities/agent-markup-config.entity';
import { Role } from '../entities/enums';
import { applyTimeFilter } from '../common/utils/time-filter.util';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
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

    // Ensure at least one of each type
    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < 10; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private sanitizeUser(user: User) {
    const { password, deletedAt, ...rest } = user;
    return rest;
  }

  async getDashboard(timeFilter?: string) {
    const orgQb = this.orgRepo
      .createQueryBuilder('org')
      .where('org.deletedAt IS NULL');
    applyTimeFilter(orgQb, 'org', timeFilter);

    const totalOrgs = await orgQb.getCount();
    const activeOrgs = await orgQb
      .clone()
      .andWhere('org.isActive = :active', { active: true })
      .getCount();

    const userQb = this.userRepo
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');
    applyTimeFilter(userQb, 'user', timeFilter);

    const totalUsers = await userQb.getCount();
    const orgAdmins = await userQb
      .clone()
      .andWhere('user.role = :role', { role: Role.ORG_ADMIN })
      .getCount();
    const agents = await userQb
      .clone()
      .andWhere('user.role = :role', { role: Role.AGENT })
      .getCount();

    const quoteQb = this.quoteRepo
      .createQueryBuilder('quote')
      .where('quote.deletedAt IS NULL');
    applyTimeFilter(quoteQb, 'quote', timeFilter);

    const totalQuotes = await quoteQb.getCount();
    const quotesByStatus = await quoteQb
      .clone()
      .select('quote.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('quote.status')
      .getRawMany();

    return {
      organizations: { total: totalOrgs, active: activeOrgs },
      users: { total: totalUsers, orgAdmins, agents },
      quotes: {
        total: totalQuotes,
        byStatus: quotesByStatus.reduce(
          (acc, item) => ({ ...acc, [item.status]: parseInt(item.count, 10) }),
          {},
        ),
      },
    };
  }

  async listOrgs(
    page: number = 1,
    limit: number = 10,
    search?: string,
    timeFilter?: string,
  ) {
    const qb = this.orgRepo
      .createQueryBuilder('org')
      .where('org.deletedAt IS NULL');

    if (search) {
      qb.andWhere('org.name ILIKE :search', { search: `%${search}%` });
    }

    applyTimeFilter(qb, 'org', timeFilter);

    const total = await qb.getCount();
    const orgs = await qb
      .orderBy('org.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Enrich with counts and orgAdmin
    const enriched = await Promise.all(
      orgs.map(async (org) => {
        const usersCount = await this.userRepo.count({
          where: { orgId: org.id, deletedAt: IsNull() },
        });
        const quotesCount = await this.quoteRepo.count({
          where: { orgId: org.id, deletedAt: IsNull() },
        });
        const servicesCount = await this.serviceRepo.count({
          where: { orgId: org.id, deletedAt: IsNull() },
        });

        const orgAdmin = await this.userRepo.findOne({
          where: { orgId: org.id, role: Role.ORG_ADMIN, deletedAt: IsNull() },
        });

        return {
          ...org,
          _count: { users: usersCount, quotes: quotesCount, services: servicesCount },
          orgAdmin: orgAdmin ? this.sanitizeUser(orgAdmin) : null,
        };
      }),
    );

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createOrg(data: { name: string; slug?: string; description?: string }) {
    const slug = data.slug || this.slugify(data.name);

    const existing = await this.orgRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Slug already taken');
    }

    const org = this.orgRepo.create({
      name: data.name,
      slug,
      description: data.description,
    });

    return this.orgRepo.save(org);
  }

  async getOrg(id: string) {
    const org = await this.orgRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const usersCount = await this.userRepo.count({
      where: { orgId: id, deletedAt: IsNull() },
    });
    const quotesCount = await this.quoteRepo.count({
      where: { orgId: id, deletedAt: IsNull() },
    });
    const servicesCount = await this.serviceRepo.count({
      where: { orgId: id, deletedAt: IsNull() },
    });

    const orgAdmin = await this.userRepo.findOne({
      where: { orgId: id, role: Role.ORG_ADMIN, deletedAt: IsNull() },
    });

    return {
      ...org,
      _count: { users: usersCount, quotes: quotesCount, services: servicesCount },
      orgAdmin: orgAdmin ? this.sanitizeUser(orgAdmin) : null,
    };
  }

  async updateOrg(
    id: string,
    data: { name?: string; slug?: string; description?: string },
  ) {
    const org = await this.orgRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (data.slug && data.slug !== org.slug) {
      const existing = await this.orgRepo.findOne({
        where: { slug: data.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Slug already taken');
      }
    }

    if (data.name !== undefined) org.name = data.name;
    if (data.slug !== undefined) org.slug = data.slug;
    if (data.description !== undefined) org.description = data.description;

    return this.orgRepo.save(org);
  }

  async updateOrgStatus(id: string, isActive: boolean) {
    const org = await this.orgRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');

    org.isActive = isActive;
    return this.orgRepo.save(org);
  }

  async deleteOrg(id: string) {
    const org = await this.orgRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');

    org.deletedAt = new Date();
    await this.orgRepo.save(org);

    // Soft delete all users in this org
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ deletedAt: new Date() })
      .where('orgId = :orgId AND deletedAt IS NULL', { orgId: id })
      .execute();

    return { message: 'Organization deleted successfully' };
  }

  async createOrgAdmin(data: { name: string; email: string; orgId: string }) {
    const org = await this.orgRepo.findOne({
      where: { id: data.orgId, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.isActive) throw new BadRequestException('Organization is not active');

    const existingAdmin = await this.userRepo.findOne({
      where: { orgId: data.orgId, role: Role.ORG_ADMIN, deletedAt: IsNull() },
    });
    if (existingAdmin) {
      throw new ConflictException('Organization already has an admin');
    }

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
      role: Role.ORG_ADMIN,
      orgId: data.orgId,
      mustChangePassword: true,
    });

    const saved = await this.userRepo.save(user);

    return { user: this.sanitizeUser(saved), tempPassword };
  }

  async inviteUser(
    orgId: string,
    data: { name: string; email: string; role: Role },
  ) {
    if (data.role !== Role.ORG_ADMIN && data.role !== Role.AGENT) {
      throw new BadRequestException('Role must be ORG_ADMIN or AGENT');
    }

    const org = await this.orgRepo.findOne({
      where: { id: orgId, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const existingEmail = await this.userRepo.findOne({
      where: { email: data.email, deletedAt: IsNull() },
    });
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    if (data.role === Role.ORG_ADMIN) {
      const existingAdmin = await this.userRepo.findOne({
        where: { orgId, role: Role.ORG_ADMIN, deletedAt: IsNull() },
      });
      if (existingAdmin) {
        throw new ConflictException('Organization already has an admin');
      }
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      orgId,
      mustChangePassword: true,
    });

    const saved = await this.userRepo.save(user);

    // If agent, create default markup config
    if (data.role === Role.AGENT) {
      const markupConfig = this.markupConfigRepo.create({
        agentId: saved.id,
        options: [
          { percentage: 10, flagged: false },
          { percentage: 15, flagged: false },
          { percentage: 20, flagged: false },
        ],
      });
      await this.markupConfigRepo.save(markupConfig);
    }

    return { user: this.sanitizeUser(saved), tempPassword };
  }

  async updateUserStatus(orgId: string, userId: string, isActive: boolean) {
    const user = await this.userRepo.findOne({
      where: { id: userId, orgId, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ORG_ADMIN) {
      throw new ForbiddenException('Cannot suspend Org Admin users');
    }

    user.isActive = isActive;
    return this.sanitizeUser(await this.userRepo.save(user));
  }

  async deleteUser(orgId: string, userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, orgId, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ORG_ADMIN) {
      throw new ForbiddenException('Cannot delete Org Admin users');
    }

    user.deletedAt = new Date();
    await this.userRepo.save(user);

    return { message: 'User deleted successfully' };
  }

  async remindOrg(orgId: string) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId, deletedAt: IsNull() },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const orgAdmin = await this.userRepo.findOne({
      where: { orgId, role: Role.ORG_ADMIN, deletedAt: IsNull() },
    });
    if (!orgAdmin) {
      throw new NotFoundException('No Org Admin found for this organization');
    }

    // TODO: Send invite email reminder
    return { message: 'Reminder sent successfully' };
  }

  async getOrgUsers(
    orgId: string,
    page: number = 1,
    limit: number = 10,
    timeFilter?: string,
  ) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.orgId = :orgId', { orgId })
      .andWhere('user.deletedAt IS NULL');

    applyTimeFilter(qb, 'user', timeFilter);

    const total = await qb.getCount();
    const users = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const enriched = await Promise.all(
      users.map(async (user) => {
        const quoteCount = await this.quoteRepo.count({
          where: { createdById: user.id, deletedAt: IsNull() },
        });

        const lastQuote = await this.quoteRepo.findOne({
          where: { createdById: user.id, deletedAt: IsNull() },
          order: { createdAt: 'DESC' },
        });

        return {
          ...this.sanitizeUser(user),
          _count: { quotes: quoteCount },
          lastActivity: lastQuote?.createdAt || user.createdAt,
        };
      }),
    );

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDashboard(orgId: string, userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, orgId, deletedAt: IsNull() },
    });
    if (!user) throw new NotFoundException('User not found');

    const totalQuotes = await this.quoteRepo.count({
      where: { createdById: userId, deletedAt: IsNull() },
    });

    const recentQuotes = await this.quoteRepo.find({
      where: { createdById: userId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const quotesByStatus = await this.quoteRepo
      .createQueryBuilder('quote')
      .select('quote.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('quote.createdById = :userId', { userId })
      .andWhere('quote.deletedAt IS NULL')
      .groupBy('quote.status')
      .getRawMany();

    return {
      user: this.sanitizeUser(user),
      stats: {
        totalQuotes,
        quotesByStatus: quotesByStatus.reduce(
          (acc, item) => ({ ...acc, [item.status]: parseInt(item.count, 10) }),
          {},
        ),
      },
      recentQuotes,
    };
  }

  async getQuoteDetail(orgId: string, quoteId: string) {
    const quote = await this.quoteRepo.findOne({
      where: { id: quoteId, orgId, deletedAt: IsNull() },
      relations: ['createdBy'],
    });
    if (!quote) throw new NotFoundException('Quote not found');

    return {
      ...quote,
      vendorTotal: quote.vendorTotal ? Number(quote.vendorTotal) : null,
      markupValue: quote.markupValue ? Number(quote.markupValue) : null,
      clientTotal: quote.clientTotal ? Number(quote.clientTotal) : null,
      createdBy: quote.createdBy
        ? {
            id: quote.createdBy.id,
            name: quote.createdBy.name,
            role: quote.createdBy.role,
          }
        : null,
    };
  }
}
