import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('agent_markup_configs')
export class AgentMarkupConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  agentId: string;

  @Column({ type: 'jsonb', default: '[]' })
  options: any; // Array of { percentage: number, flagged: boolean }
                // Example: [{ "percentage": 5, "flagged": true }, { "percentage": 15, "flagged": false }]
                // "Custom" is always available and always flagged — not stored here

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.markupConfig)
  @JoinColumn({ name: 'agentId' })
  agent: User;
}
