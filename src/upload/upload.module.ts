import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Service } from '../entities/service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service]),
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
