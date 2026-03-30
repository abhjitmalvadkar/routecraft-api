import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Destination } from './destination.entity';
import { Service } from './service.entity';
import { Quote } from './quote.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index()
  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ default: 3 })
  defaultQuoteValidity: number; // days (1-7)

  @Index()
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Destination, (destination) => destination.organization)
  destinations: Destination[];

  @OneToMany(() => Service, (service) => service.organization)
  services: Service[];

  @OneToMany(() => Quote, (quote) => quote.organization)
  quotes: Quote[];
}
