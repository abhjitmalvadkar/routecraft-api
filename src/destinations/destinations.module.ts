import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationsController } from './destinations.controller';
import { DestinationsService } from './destinations.service';
import { Destination } from '../entities/destination.entity';
import { Service } from '../entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Destination, Service])],
  controllers: [DestinationsController],
  providers: [DestinationsService],
  exports: [DestinationsService],
})
export class DestinationsModule {}
