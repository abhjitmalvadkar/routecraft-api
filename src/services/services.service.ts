import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Service } from '../entities/service.entity';
import { ServiceCategory, RateUnit } from '../entities/enums';
import { applyTimeFilter } from '../common/utils/time-filter.util';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
  ) {}

  private getRateUnit(category: ServiceCategory): RateUnit {
    switch (category) {
      case ServiceCategory.HOTELS:
        return RateUnit.PER_ROOM_NIGHT;
      case ServiceCategory.TRANSFERS:
        return RateUnit.PER_VEHICLE;
      case ServiceCategory.ACTIVITIES:
        return RateUnit.PER_PERSON;
      case ServiceCategory.MEALS:
        return RateUnit.PER_PERSON;
      default:
        return RateUnit.PER_PERSON;
    }
  }

  private toNumber(val: any): number | null {
    if (val === null || val === undefined) return null;
    return Number(val);
  }

  async list(
    orgId: string,
    filters: {
      category?: ServiceCategory;
      destinationId?: string;
      search?: string;
      page?: number;
      limit?: number;
      timeFilter?: string;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const qb = this.serviceRepo
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.destination', 'destination')
      .where('service.orgId = :orgId', { orgId })
      .andWhere('service.deletedAt IS NULL');

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

    applyTimeFilter(qb, 'service', filters.timeFilter);

    const total = await qb.getCount();
    const services = await qb
      .orderBy('service.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items: services.map((s) => ({
        ...s,
        vendorRate: this.toNumber(s.vendorRate),
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

  async getOne(id: string, orgId: string) {
    const service = await this.serviceRepo.findOne({
      where: { id, orgId, deletedAt: IsNull() },
      relations: ['destination'],
    });
    if (!service) throw new NotFoundException('Service not found');

    return {
      ...service,
      vendorRate: this.toNumber(service.vendorRate),
    };
  }

  async create(
    orgId: string,
    data: {
      name: string;
      description: string;
      category: ServiceCategory;
      destinationId: string;
      vendorRate: number;
      metadata?: any;
    },
  ) {
    const rateUnit = this.getRateUnit(data.category);

    const service = this.serviceRepo.create({
      ...data,
      orgId,
      rateUnit,
    });

    const saved = await this.serviceRepo.save(service);
    return {
      ...saved,
      vendorRate: this.toNumber(saved.vendorRate),
    };
  }

  async update(
    id: string,
    orgId: string,
    data: {
      name?: string;
      description?: string;
      category?: ServiceCategory;
      destinationId?: string;
      vendorRate?: number;
      metadata?: any;
    },
  ) {
    const service = await this.serviceRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.orgId !== orgId) throw new ForbiddenException('Access denied');

    if (data.name !== undefined) service.name = data.name;
    if (data.description !== undefined) service.description = data.description;
    if (data.category !== undefined) {
      service.category = data.category;
      service.rateUnit = this.getRateUnit(data.category);
    }
    if (data.destinationId !== undefined) service.destinationId = data.destinationId;
    if (data.vendorRate !== undefined) service.vendorRate = data.vendorRate;
    if (data.metadata !== undefined) service.metadata = data.metadata;

    const saved = await this.serviceRepo.save(service);
    return {
      ...saved,
      vendorRate: this.toNumber(saved.vendorRate),
    };
  }

  async delete(id: string, orgId: string) {
    const service = await this.serviceRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.orgId !== orgId) throw new ForbiddenException('Access denied');

    service.deletedAt = new Date();
    await this.serviceRepo.save(service);

    return { message: 'Service deleted successfully' };
  }
}
