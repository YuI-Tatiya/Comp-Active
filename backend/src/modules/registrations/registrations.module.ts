import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './registrations.repository';
import { RegistrationsController } from './registrations.controller';
import { EvaluationsService } from './evaluation.service';
import { EvaluationsRepository } from './evaluation.repository';
import { EvaluationsController } from './evaluation.controller';

@Module({
  controllers: [RegistrationsController, EvaluationsController],
  providers: [
    RegistrationsService,
    RegistrationsRepository,
    EvaluationsService,
    EvaluationsRepository,
  ],
  exports: [
    RegistrationsService,
    RegistrationsRepository,
    EvaluationsService,
    EvaluationsRepository,
  ],
})
export class RegistrationsModule {}
