import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Registration } from '../../registrations/entities/registration.entity';
import { User } from '../../users/entities/user.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Registration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_id' })
  registration: Registration;

  @Column({ name: 'registration_id', unique: true })
  registrationId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'evaluator_id' })
  evaluator: User;

  @Column({ name: 'evaluator_id' })
  evaluatorId: number;

  // Soft Skills scores (1-10)
  @Column({ type: 'int', default: 0 })
  teamwork: number;

  @Column({ type: 'int', default: 0 })
  leadership: number;

  @Column({ type: 'int', default: 0 })
  communication: number;

  @Column({ name: 'problem_solving', type: 'int', default: 0 })
  problemSolving: number;

  @Column({ type: 'int', default: 0 })
  adaptability: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
