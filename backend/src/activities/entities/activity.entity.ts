import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ActivityTag } from './activity-tag.entity';
import { ActivityCondition } from './activity-condition.entity';
import { ActivityBenefit } from './activity-benefit.entity';
import { ActivitySoftSkill } from './activity-soft-skill.entity';
import { Registration } from '../../registrations/entities/registration.entity';
import { ActivityStatus, ApprovalStatus } from '../../common/enums/status.enum';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @Column({ name: 'organizer_id' })
  organizerId: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 100 })
  category: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'start_time', length: 10 })
  startTime: string;

  @Column({ name: 'end_time', length: 10 })
  endTime: string;

  @Column({ length: 255 })
  location: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.OPEN,
  })
  status: ActivityStatus;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => ActivityTag, (tag) => tag.activity, {
    cascade: true,
    eager: true,
  })
  tags: ActivityTag[];

  @OneToMany(() => ActivityCondition, (condition) => condition.activity, {
    cascade: true,
    eager: true,
  })
  conditions: ActivityCondition[];

  @OneToMany(() => ActivityBenefit, (benefit) => benefit.activity, {
    cascade: true,
    eager: true,
  })
  benefits: ActivityBenefit[];

  @OneToMany(() => ActivitySoftSkill, (softSkill) => softSkill.activity, {
    cascade: true,
    eager: true,
  })
  softSkills: ActivitySoftSkill[];

  @OneToMany(() => Registration, (registration) => registration.activity)
  registrations: Registration[];
}
