import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Registration } from '../../registrations/entities/registration.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Registration, (registration) => registration.certificate, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'registration_id' })
  registration: Registration;

  @Column({ name: 'registration_id' })
  registrationId: number;

  @CreateDateColumn({ name: 'issue_date' })
  issueDate: Date;

  @Column({ name: 'certificate_url', length: 255 })
  certificateUrl: string;
}
