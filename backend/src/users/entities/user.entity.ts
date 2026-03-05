import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../../common/enums/role.enum';
import { Activity } from '../../activities/entities/activity.entity';
import { Registration } from '../../registrations/entities/registration.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'student_id', type: 'varchar', length: 20, nullable: true })
  studentId: string | null;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true })
  googleId: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => Activity, (activity) => activity.organizer)
  activities: Activity[];

  @OneToMany(() => Registration, (registration) => registration.student)
  registrations: Registration[];
}
