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
import { QuoteStatus } from './enums';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  orgId: string;

  @Index()
  @Column()
  createdById: string;

  @Column()
  name: string; // Auto-generated: "Dubai 3D2N Romantic Escape — Apr 2026"

  @Index()
  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Column({ nullable: true })
  bookingType: string; // "FIT" or "GIT"

  @Column({ type: 'int', nullable: true })
  passengerCount: number;

  @Column({ type: 'int', nullable: true })
  adultsCount: number;

  @Column({ type: 'int', nullable: true })
  childrenCount: number;

  @Column({ type: 'timestamp', nullable: true })
  travelStartDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  travelEndDate: Date;

  @Column({ type: 'text', array: true, default: '{}' })
  destinations: string[]; // City names involved

  @Column({ type: 'jsonb', default: '[]' })
  itinerary: any; // Full day-by-day itinerary

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  vendorTotal: number; // Sum of all vendor rates

  @Column({ nullable: true })
  markupType: string; // "percentage" or "custom"

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  markupValue: number; // Percentage value OR custom total

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  clientTotal: number; // Final price client sees

  @Column({ nullable: true })
  pricingFormat: string; // "full_package" or "itemized"

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date;

  @Column({ type: 'jsonb', default: '[]' })
  reworkComments: any; // Array of { from, comment, timestamp }

  @Column({ type: 'jsonb', default: '[]' })
  aiConversation: any; // AI conversation history

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => Organization, (org) => org.quotes)
  @JoinColumn({ name: 'orgId' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.quotes)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;
}
