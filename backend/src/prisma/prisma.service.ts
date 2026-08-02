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
  get user() { return this._client.user; }
  get activity() { return this._client.activity; }
  get activityTag() { return this._client.activityTag; }
  get activityCondition() { return this._client.activityCondition; }
  get activityBenefit() { return this._client.activityBenefit; }
  get activitySoftSkill() { return this._client.activitySoftSkill; }
  get registration() { return this._client.registration; }
  get certificate() { return this._client.certificate; }
  get evaluation() { return this._client.evaluation; }
  get organizerRequest() { return this._client.organizerRequest; }
  get adminInvite() { return this._client.adminInvite; }
  get apiKey() { return this._client.apiKey; }
  get siteContent() { return this._client.siteContent; }

  // ─── Prisma helpers ─────────────────────────────────────────────────────────
  $transaction: PrismaInstance['$transaction'] = (...args: any[]) =>
    (this._client.$transaction as any)(...args);

  async onModuleInit() {
    await this._client.$connect();
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }
}
