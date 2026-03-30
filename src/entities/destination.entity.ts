import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Service } from './service.entity';

@Entity('destinations')
export class Destination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  orgId: string;

  @Column()
  name: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => Organization, (org) => org.destinations)
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @OneToMany(() => Service, (service) => service.destination)
  services: Service[];
}
