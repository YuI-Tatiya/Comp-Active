import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './registrations.repository';
import { EvaluationsService } from './evaluation.service';
import { EvaluationBatchService } from './evaluation-batch.service';
import { EvaluationsRepository } from './evaluation.repository';
import { AssessmentsService } from './assessment.service';
import { AssessmentsRepository } from './assessment.repository';
import { EvaluationApprovalService } from './evaluation-approval.service';
import { EvaluationApprovalRepository } from './evaluation-approval.repository';
import { MailModule } from '../mail/mail.module';

// Logic-only — no controllers. Every registrations/evaluations route is role-specific
// (no bare `:id` GET route exists here, so unlike activities/certificates there's no
// registration-order hazard splitting off a separate "public" module).
@Module({
  imports: [MailModule],
  providers: [
    RegistrationsService,
    RegistrationsRepository,
    EvaluationsService,
    EvaluationBatchService,
    EvaluationsRepository,
    AssessmentsService,
    AssessmentsRepository,
    EvaluationApprovalService,
    EvaluationApprovalRepository,
  ],
  exports: [
    RegistrationsService,
    RegistrationsRepository,
    EvaluationsService,
    EvaluationBatchService,
    EvaluationsRepository,
    AssessmentsService,
    AssessmentsRepository,
    EvaluationApprovalService,
    EvaluationApprovalRepository,
  ],
})
export class RegistrationsModule {}
