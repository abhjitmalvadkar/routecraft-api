import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from './enums';
import { Organization } from './organization.entity';
import { Quote } from './quote.entity';
import { AgentMarkupConfig } from './agent-markup-config.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Index()
  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Index()
  @Column({ nullable: true })
  orgId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  mustChangePassword: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @OneToMany(() => Quote, (quote) => quote.createdBy)
  quotes: Quote[];

  @OneToOne(() => AgentMarkupConfig, (config) => config.agent)
  markupConfig: AgentMarkupConfig;
}
