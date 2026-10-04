import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type PrismaInstance = InstanceType<typeof PrismaClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly _client: PrismaInstance;

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    this._client = new (PrismaClient as any)({ adapter });
  }

  // ─── Model delegates ────────────────────────────────────────────────────────
  get user() {
    return this._client.user;
  }
  get event() {
    return this._client.event;
  }
  get eventDraft() {
    return this._client.eventDraft;
  }
  get activity() {
    return this._client.activity;
  }
  get activityTag() {
    return this._client.activityTag;
  }
  get activityCondition() {
    return this._client.activityCondition;
  }
  get activityBenefit() {
    return this._client.activityBenefit;
  }
  get activitySoftSkill() {
    return this._client.activitySoftSkill;
  }
  get registration() {
    return this._client.registration;
  }
  get certificate() {
    return this._client.certificate;
  }
  get evaluation() {
    return this._client.evaluation;
  }
  get evaluationBaseline() {
    return this._client.evaluationBaseline;
  }
  get evaluationException() {
    return this._client.evaluationException;
  }
  get assessmentAssignment() {
    return this._client.assessmentAssignment;
  }
  get assessmentScore() {
    return this._client.assessmentScore;
  }
  get evaluationApproval() {
    return this._client.evaluationApproval;
  }
  get activityQuestion() {
    return this._client.activityQuestion;
  }
  get activityQuestionOption() {
    return this._client.activityQuestionOption;
  }
  get registrationAnswer() {
    return this._client.registrationAnswer;
  }
  get registrationAnswerOption() {
    return this._client.registrationAnswerOption;
  }
  get eventSurveyQuestion() {
    return this._client.eventSurveyQuestion;
  }
  get registrationSurveyAnswer() {
    return this._client.registrationSurveyAnswer;
  }
  get eventVisibilityProgram() {
    return this._client.eventVisibilityProgram;
  }
  get eventVisibilityYear() {
    return this._client.eventVisibilityYear;
  }
  get organizerRequest() {
    return this._client.organizerRequest;
  }
  get adminInvite() {
    return this._client.adminInvite;
  }
  get apiKey() {
    return this._client.apiKey;
  }
  get siteContent() {
    return this._client.siteContent;
  }

  // ─── Prisma helpers ─────────────────────────────────────────────────────────
  $transaction: PrismaInstance['$transaction'] = (...args: any[]) => (this._client.$transaction as any)(...args);

  async onModuleInit() {
    await this._client.$connect();
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }
}
