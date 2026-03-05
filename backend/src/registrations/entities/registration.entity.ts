import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Activity } from '../../activities/entities/activity.entity';
import { User } from '../../users/entities/user.entity';
import { Certificate } from '../../certificates/entities/certificate.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import {
  RegistrationStatus,
  AttendanceStatus,
} from '../../common/enums/status.enum';

@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Activity, (activity) => activity.registrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ name: 'activity_id' })
  activityId: number;

  @ManyToOne(() => User, (user) => user.registrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id' })
  studentId: number;

  @CreateDateColumn({ name: 'register_date' })
  registerDate: Date;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.ABSENT,
  })
  attendance: AttendanceStatus;

  @Column({ name: 'check_in_time', type: 'timestamp', nullable: true })
  checkInTime: Date | null;

  // Relations
  @OneToOne(() => Certificate, (certificate) => certificate.registration)
  certificate: Certificate;

  @OneToOne(() => Evaluation, (evaluation) => evaluation.registration)
  evaluation: Evaluation;
}
