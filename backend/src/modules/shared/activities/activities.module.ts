import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesRepository } from './activities.repository';
import { EventsModule } from '../events/events.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { MailModule } from '../mail/mail.module';

// Logic-only module (no controllers) — safe to import from admin/organizer/student
// for DI without dragging in route registration order concerns. The public-facing
// routes (including the bare GET /:id) live in ActivitiesPublicModule instead — see
// that file for why the split exists.
//
// Imports RegistrationsModule + MailModule so markCompleted/requestCancellation can
// notify affected students by email — RegistrationsModule never imports this module
// back, so no circular dependency.
// EventsModule ไม่ import โมดูลใดเลย จึงดึงเข้ามาได้โดยไม่เกิด circular dependency
// (ต้องใช้ EventsRepository อ่านแบบสำรวจของงานแม่ ให้หน้ากิจกรรมย่อยแสดงผลสำรวจได้)
@Module({
  imports: [EventsModule, RegistrationsModule, MailModule],
  providers: [ActivitiesService, ActivitiesRepository],
  exports: [ActivitiesService, ActivitiesRepository],
})
export class ActivitiesModule {}
