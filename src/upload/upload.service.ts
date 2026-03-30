import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../entities/service.entity';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @InjectRepository(Service)
    private serviceRepo: Repository<Service>,
  ) {}

  async uploadServicePhoto(
    serviceId: string,
    file: Express.Multer.File,
    orgId?: string,
  ): Promise<{ path: string }> {
    const where: any = { id: serviceId };
    if (orgId) where.orgId = orgId;
    const service = await this.serviceRepo.findOneOrFail({ where });

    // Create directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'services', serviceId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // Update service photos array
    const relativePath = `/uploads/services/${serviceId}/${filename}`;
    const photos = service.photos || [];
    photos.push(relativePath);
    service.photos = photos;
    await this.serviceRepo.save(service);

    this.logger.log(`Photo uploaded for service ${serviceId}: ${relativePath}`);

    return { path: relativePath };
  }
}
