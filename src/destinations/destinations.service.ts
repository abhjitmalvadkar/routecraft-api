import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Destination } from '../entities/destination.entity';
import { Service } from '../entities/service.entity';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private destRepo: Repository<Destination>,
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
  ) {}

  async list(orgId: string) {
    const destinations = await this.destRepo.find({
      where: { orgId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    const enriched = await Promise.all(
      destinations.map(async (dest) => {
        const servicesCount = await this.serviceRepo.count({
          where: { destinationId: dest.id, deletedAt: IsNull() },
        });
        return {
          ...dest,
          _count: { services: servicesCount },
        };
      }),
    );

    return enriched;
  }

  async create(
    orgId: string,
    data: { name: string; country: string; description?: string; image?: string },
  ) {
    const dest = this.destRepo.create({
      ...data,
      orgId,
    });
    return this.destRepo.save(dest);
  }

  async update(
    id: string,
    orgId: string,
    data: { name?: string; country?: string; description?: string; image?: string },
  ) {
    const dest = await this.destRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!dest) throw new NotFoundException('Destination not found');
    if (dest.orgId !== orgId) throw new ForbiddenException('Access denied');

    if (data.name !== undefined) dest.name = data.name;
    if (data.country !== undefined) dest.country = data.country;
    if (data.description !== undefined) dest.description = data.description;
    if (data.image !== undefined) dest.image = data.image;

    return this.destRepo.save(dest);
  }

  async delete(id: string, orgId: string) {
    const dest = await this.destRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!dest) throw new NotFoundException('Destination not found');
    if (dest.orgId !== orgId) throw new ForbiddenException('Access denied');

    dest.deletedAt = new Date();
    await this.destRepo.save(dest);

    return { message: 'Destination deleted successfully' };
  }
}
