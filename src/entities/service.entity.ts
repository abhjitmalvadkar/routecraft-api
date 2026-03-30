import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ServiceCategory, RateUnit } from './enums';
import { Organization } from './organization.entity';
import { Destination } from './destination.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  orgId: string;

  @Index()
  @Column()
  destinationId: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Index()
  @Column({ type: 'enum', enum: ServiceCategory })
  category: ServiceCategory;

  @Column({ type: 'text', array: true, default: '{}' })
  photos: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  vendorRate: number;

  @Column({ type: 'enum', enum: RateUnit })
  rateUnit: RateUnit;

  @Index()
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => Organization, (org) => org.services)
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @ManyToOne(() => Destination, (dest) => dest.services)
  @JoinColumn({ name: 'destinationId' })
  destination: Destination;
}
