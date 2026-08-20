# Event-Aware Organizer/Student Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `/organizer/manage`, `/organizer/manage/[id]/edit`, `/organizer/events/[id]`, `/student/events`, and `/student/events/[id]` off the legacy single-Activity model onto the Event+Activities model the `/organizer/create` wizard already uses, adding the missing backend Event-update/read endpoints this requires, and fixing the resulting "uploaded image doesn't show" bug along the way.

**Architecture:** Backend gets a new `PATCH /api/events/:id` (replace-all-children update, blocked on activities with existing registrations) plus a public/student read side (`GET /api/events`, `GET /api/events/:id/public`) mirroring the visibility filtering `activities-public.controller.ts` already does. Frontend rebuilds the 5 pages around `eventsAPI`, reusing the 4 wizard section components (`SectionEventBasics`, `SectionActivities`, `SectionSurvey`, `SectionPublish`) for the edit page, and a shared `resolveEventImageUrl` helper for the image-fallback fix.

**Tech Stack:** NestJS + Prisma (`@prisma/adapter-pg`) backend, Next.js 16 App Router + React 19 + Tailwind v4 frontend. No new dependencies.

**Spec:** `Plan.md` (repo root)

## Global Constraints

- Prisma access only through `PrismaService`; never instantiate `PrismaClient` directly (CLAUDE.md).
- Every request body needs a DTO with `class-validator` decorators; global `ValidationPipe` has `whitelist: true, forbidNonWhitelisted: true` — extra fields are rejected, not ignored.
- Controller responses are auto-wrapped as `{ success, data, timestamp }` by `TransformInterceptor` — don't wrap manually.
- `frontend/` has no test framework configured — frontend tasks verify manually against a running dev server, not via automated tests. `backend/` has Jest configured (`rootDir: src`, `testRegex: .*\.spec\.ts$`) but **no existing `.spec.ts` files anywhere in `backend/src/modules`** — the tests in Task 1/2 are the first of their kind; follow standard NestJS `Test.createTestingModule` + mocked-repository conventions, there is no existing file to pattern-match against.
- Thai-language user-facing strings throughout (error messages, labels) — match the tone/phrasing already used in `EventsService.create` and the wizard components (direct, specific, no jargon).
- Design tokens only in new/touched JSX — `text-fg`, `text-fg-muted`, `text-fg-subtle`, `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`, `bg-brand-*`, `text-danger`/`bg-danger-bg`, `text-warning`/`bg-warning-bg`, `text-success`. Never introduce raw Tailwind `gray-*`/`blue-*`/`red-*` in touched files (several exist today in the files this plan replaces — remove them as part of the rewrite, don't preserve them).
- `API_BASE_URL` prefixes all relative `imageUrl`/`attachmentUrl` values when rendering `<img>`/links — every file in this plan that renders an image must go through the new `resolveEventImageUrl` helper (Task 4), not ad-hoc string concatenation.

---

## Task 1: `UpdateEventDto` + `EventsRepository.update`

**Files:**
- Create: `backend/src/modules/shared/events/dto/update-event.dto.ts`
- Modify: `backend/src/modules/shared/events/events.repository.ts`
- Test: `backend/src/modules/shared/events/events.repository.spec.ts`

**Interfaces:**
- Consumes: `eventInclude`, `PreparedActivityData`, `PreparedSurveyQuestionData` (existing, `events.repository.ts`); `activityInclude` (existing, `../activities/activities.repository.ts`).
- Produces: `UpdateEventDto` class (consumed by Task 2's `EventsService.update`); `EventsRepository.update(eventId: number, data: PreparedEventUpdateData, removedActivityIds: number[]): Promise<EventWithRelations>` (consumed by Task 2); `PreparedEventUpdateData` / `PreparedActivityUpdateData` interfaces (consumed by Task 2).

- [ ] **Step 1: Write `UpdateEventDto`**

```typescript
// backend/src/modules/shared/events/dto/update-event.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEventActivityDto } from './create-event-activity.dto';
import { SurveyQuestionType, EventVisibility } from '../../../../common/enums/status.enum';

class UpdateSurveyQuestionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ enum: Object.values(SurveyQuestionType) })
  @IsIn(Object.values(SurveyQuestionType))
  type: SurveyQuestionType;

  @ApiPropertyOptional({ minimum: 2, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  scaleMax?: number;
}

/** เหมือน CreateEventActivityDto ทุกฟิลด์ แต่เพิ่ม id (ถ้ามี = แก้ไขของเดิม, ถ้าไม่มี = สร้างใหม่) */
export class UpdateEventActivityDto extends CreateEventActivityDto {
  @ApiPropertyOptional({ description: 'ไม่ระบุ = สร้างกิจกรรมย่อยใหม่ในงานนี้, ระบุ = แก้ไขกิจกรรมย่อยเดิม' })
  @IsOptional()
  @IsInt()
  id?: number;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'ค่ายอาสาพัฒนาชนบท ปี 2569' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'URL รูปภาพงาน — ไม่ส่ง/ส่ง undefined = คงรูปเดิม' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationCloseAt?: string;

  @ApiPropertyOptional({ type: [UpdateEventActivityDto], description: 'กิจกรรมย่อยทั้งหมดของงานนี้หลังแก้ไข — ที่ไม่ส่ง id จะถูกสร้างใหม่, ของเดิมที่ไม่อยู่ในรายการนี้จะถูกลบ (ถ้าไม่มีผู้ลงทะเบียน)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateEventActivityDto)
  activities: UpdateEventActivityDto[];

  @ApiPropertyOptional({ type: [UpdateSurveyQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSurveyQuestionDto)
  surveyQuestions?: UpdateSurveyQuestionDto[];

  @ApiPropertyOptional({ enum: Object.values(EventVisibility) })
  @IsOptional()
  @IsIn(Object.values(EventVisibility))
  visibility?: EventVisibility;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visibilityPrograms?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  visibilityYears?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visibilityStudentIdFilter?: string;
}
```

- [ ] **Step 2: Add `PreparedEventUpdateData`/`PreparedActivityUpdateData` types and `EventsRepository.update` in `events.repository.ts`**

Add these interfaces near the existing `PreparedEventData`/`PreparedActivityData` (top of file):

```typescript
export interface PreparedActivityUpdateData extends PreparedActivityData {
  /** ไม่มี = สร้างกิจกรรมย่อยใหม่ */
  id?: number;
}

export interface PreparedEventUpdateData {
  name: string;
  description: string;
  imageUrl?: string;
  isPublic: boolean;
  registrationCloseAt?: Date;
  activities: PreparedActivityUpdateData[];
  surveyQuestions: PreparedSurveyQuestionData[];
  visibility: string;
  visibilityPrograms: string[];
  visibilityYears: number[];
  visibilityStudentIdFilter?: string;
}
```

Add this method to the `EventsRepository` class, after `create`:

```typescript
  update(eventId: number, data: PreparedEventUpdateData, removedActivityIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: {
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          isPublic: data.isPublic,
          registrationCloseAt: data.registrationCloseAt,
          visibility: data.visibility as any,
          visibilityStudentIdFilter: data.visibilityStudentIdFilter,
        },
      });

      // แบบสำรวจ — แทนที่ทั้งชุดเสมอ (ง่ายและถูกต้องกว่า diff รายข้อ)
      await tx.eventSurveyQuestion.deleteMany({ where: { eventId } });
      if (data.surveyQuestions.length) {
        await tx.eventSurveyQuestion.createMany({
          data: data.surveyQuestions.map((q, sortOrder) => ({
            eventId,
            label: q.label,
            type: q.type as any,
            scaleMax: q.scaleMax,
            sortOrder,
          })),
        });
      }

      // เงื่อนไขการมองเห็น — แทนที่ทั้งชุดเสมอเช่นกัน
      await tx.eventVisibilityProgram.deleteMany({ where: { eventId } });
      if (data.visibilityPrograms.length) {
        await tx.eventVisibilityProgram.createMany({
          data: data.visibilityPrograms.map((programCode) => ({ eventId, programCode })),
        });
      }
      await tx.eventVisibilityYear.deleteMany({ where: { eventId } });
      if (data.visibilityYears.length) {
        await tx.eventVisibilityYear.createMany({
          data: data.visibilityYears.map((year) => ({ eventId, year })),
        });
      }

      // กิจกรรมย่อยที่ถูกเอาออก — cascade ลบ tags/conditions/benefits/softSkills/questions ให้เองผ่าน schema
      if (removedActivityIds.length) {
        await tx.activity.deleteMany({ where: { id: { in: removedActivityIds } } });
      }

      for (const activity of data.activities) {
        const { softSkillRates, questions, id, ...activityData } = activity;

        if (id) {
          await tx.activity.update({ where: { id }, data: activityData as any });

          await tx.activitySoftSkill.deleteMany({ where: { activityId: id } });
          if (softSkillRates.length) {
            await tx.activitySoftSkill.createMany({
              data: softSkillRates.map(({ skillType, rate }) => ({ activityId: id, skillType: skillType as any, rate })),
            });
          }

          await tx.activityQuestion.deleteMany({ where: { activityId: id } });
          for (const [sortOrder, q] of questions.entries()) {
            await tx.activityQuestion.create({
              data: {
                activityId: id,
                label: q.label,
                type: q.type as any,
                required: q.required,
                sortOrder,
                options: q.options.length
                  ? { create: q.options.map((label, optSortOrder) => ({ label, sortOrder: optSortOrder })) }
                  : undefined,
              },
            });
          }
        } else {
          await tx.activity.create({
            data: {
              ...activityData,
              organizerId: (await tx.event.findUniqueOrThrow({ where: { id: eventId }, select: { organizerId: true } })).organizerId,
              eventId,
              approvalStatus: 'approved' as any,
              softSkills: {
                create: softSkillRates.map(({ skillType, rate }) => ({ skillType: skillType as any, rate })),
              },
              questions: {
                create: questions.map((q, sortOrder) => ({
                  label: q.label,
                  type: q.type as any,
                  required: q.required,
                  sortOrder,
                  options: q.options.length
                    ? { create: q.options.map((label, optSortOrder) => ({ label, sortOrder: optSortOrder })) }
                    : undefined,
                })),
              },
            } as any,
          });
        }
      }

      return tx.event.findUnique({ where: { id: eventId }, include: eventInclude }) as any;
    });
  }
```

- [ ] **Step 3: Write the repository test**

```typescript
// backend/src/modules/shared/events/events.repository.spec.ts
import { Test } from '@nestjs/testing';
import { EventsRepository } from './events.repository';
import { PrismaService } from '../../../prisma/prisma.service';

describe('EventsRepository.update', () => {
  let repo: EventsRepository;
  let tx: any;
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    tx = {
      event: {
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ organizerId: 42 }),
      },
      eventSurveyQuestion: { deleteMany: jest.fn(), createMany: jest.fn() },
      eventVisibilityProgram: { deleteMany: jest.fn(), createMany: jest.fn() },
      eventVisibilityYear: { deleteMany: jest.fn(), createMany: jest.fn() },
      activity: { deleteMany: jest.fn(), update: jest.fn(), create: jest.fn() },
      activitySoftSkill: { deleteMany: jest.fn(), createMany: jest.fn() },
      activityQuestion: { deleteMany: jest.fn(), create: jest.fn() },
    };
    prisma = { $transaction: jest.fn((cb) => cb(tx)) };

    const module = await Test.createTestingModule({
      providers: [EventsRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();

    repo = module.get(EventsRepository);
  });

  it('deletes activities that were removed from the submitted list', async () => {
    await repo.update(
      1,
      {
        name: 'Updated',
        description: 'desc',
        isPublic: true,
        activities: [],
        surveyQuestions: [],
        visibility: 'everyone',
        visibilityPrograms: [],
        visibilityYears: [],
      },
      [5, 6],
    );

    expect(tx.activity.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [5, 6] } } });
  });

  it('updates an existing activity in place when it has an id', async () => {
    await repo.update(
      1,
      {
        name: 'Updated',
        description: 'desc',
        isPublic: true,
        activities: [
          {
            id: 10,
            name: 'A1',
            description: 'd',
            category: 'Technology',
            startAt: new Date(),
            endAt: new Date(),
            date: new Date(),
            startTime: '09:00',
            endTime: '10:00',
            location: 'Room 1',
            softSkillRates: [],
            questions: [],
          },
        ],
        surveyQuestions: [],
        visibility: 'everyone',
        visibilityPrograms: [],
        visibilityYears: [],
      },
      [],
    );

    expect(tx.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 } }),
    );
    expect(tx.activity.create).not.toHaveBeenCalled();
  });

  it('creates a new activity when no id is given', async () => {
    await repo.update(
      1,
      {
        name: 'Updated',
        description: 'desc',
        isPublic: true,
        activities: [
          {
            name: 'A2',
            description: 'd',
            category: 'Technology',
            startAt: new Date(),
            endAt: new Date(),
            date: new Date(),
            startTime: '09:00',
            endTime: '10:00',
            location: 'Room 1',
            softSkillRates: [],
            questions: [],
          },
        ],
        surveyQuestions: [],
        visibility: 'everyone',
        visibilityPrograms: [],
        visibilityYears: [],
      },
      [],
    );

    expect(tx.activity.create).toHaveBeenCalled();
    expect(tx.activity.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `cd backend && npx jest src/modules/shared/events/events.repository.spec.ts`
Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/shared/events/dto/update-event.dto.ts backend/src/modules/shared/events/events.repository.ts backend/src/modules/shared/events/events.repository.spec.ts
git commit -m "feat(events): add UpdateEventDto and EventsRepository.update"
```

---

## Task 2: `EventsService.update` + `PATCH /api/events/:id`

**Files:**
- Modify: `backend/src/modules/shared/events/events.service.ts`
- Modify: `backend/src/modules/organizer/events-organizer.controller.ts`
- Test: `backend/src/modules/shared/events/events.service.spec.ts`

**Interfaces:**
- Consumes: `EventsRepository.update` (Task 1), `EventsRepository.findById` (existing), `UpdateEventDto`/`UpdateEventActivityDto` (Task 1), `diffHours`/`formatHHmm` (existing, `common/utils/time.util.ts`), `ActivityQuestionType`/`SurveyQuestionType`/`EventVisibility` (existing enums).
- Produces: `EventsService.update(organizerId: number, callerRole: UserRole, eventId: number, dto: UpdateEventDto): Promise<EventWithRelations>` — consumed by the controller in this task and, indirectly, by Task 7's frontend edit page via the HTTP route.

- [ ] **Step 1: Write the service test**

```typescript
// backend/src/modules/shared/events/events.service.spec.ts
import { Test } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { UserRole } from '../../../common/enums/role.enum';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    id: 1,
    organizerId: 7,
    name: 'Camp',
    activities: [
      { id: 10, name: 'Day 1', registrations: [] },
      { id: 11, name: 'Day 2', registrations: [{ id: 99 }] },
    ],
    ...overrides,
  };
}

function makeDto(activities: any[] = []) {
  return {
    name: 'Camp',
    description: 'desc',
    activities: activities.length
      ? activities
      : [
          {
            id: 10,
            name: 'Day 1',
            description: 'd',
            category: 'Technology',
            startAt: '2027-01-01T09:00:00.000Z',
            endAt: '2027-01-01T12:00:00.000Z',
            location: 'Room 1',
          },
          {
            id: 11,
            name: 'Day 2',
            description: 'd',
            category: 'Technology',
            startAt: '2027-01-02T09:00:00.000Z',
            endAt: '2027-01-02T12:00:00.000Z',
            location: 'Room 1',
          },
        ],
  } as any;
}

describe('EventsService.update', () => {
  let service: EventsService;
  let repo: { findById: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    repo = { findById: jest.fn(), update: jest.fn().mockResolvedValue({ id: 1 }) };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update(7, UserRole.ORGANIZER, 1, makeDto())).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the caller does not own the event', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    await expect(service.update(999, UserRole.ORGANIZER, 1, makeDto())).rejects.toThrow(ForbiddenException);
  });

  it('allows an admin to update an event they do not own', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    await service.update(999, UserRole.ADMIN, 1, makeDto());
    expect(repo.update).toHaveBeenCalled();
  });

  it('rejects removing an activity that already has registrations', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    // ส่งเฉพาะ activity id 10 กลับมา -> id 11 (มีคนลงทะเบียนแล้ว) ถูกเอาออก
    await expect(
      service.update(7, UserRole.ORGANIZER, 1, makeDto([
        {
          id: 10,
          name: 'Day 1',
          description: 'd',
          category: 'Technology',
          startAt: '2027-01-01T09:00:00.000Z',
          endAt: '2027-01-01T12:00:00.000Z',
          location: 'Room 1',
        },
      ])),
    ).rejects.toThrow(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('allows removing an activity with no registrations', async () => {
    repo.findById.mockResolvedValue(makeEvent());
    await service.update(7, UserRole.ORGANIZER, 1, makeDto([
      {
        id: 11,
        name: 'Day 2',
        description: 'd',
        category: 'Technology',
        startAt: '2027-01-02T09:00:00.000Z',
        endAt: '2027-01-02T12:00:00.000Z',
        location: 'Room 1',
      },
    ]));
    expect(repo.update).toHaveBeenCalledWith(1, expect.anything(), [10]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx jest src/modules/shared/events/events.service.spec.ts`
Expected: FAIL — `service.update is not a function`.

- [ ] **Step 3: Implement `EventsService.update`**

Add to imports in `events.service.ts`:

```typescript
import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { UpdateEventDto } from './dto/update-event.dto';
```

Add this method to the `EventsService` class, after `create`:

```typescript
  async update(organizerId: number, callerRole: UserRole, eventId: number, dto: UpdateEventDto) {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('ไม่พบงาน');
    if (callerRole !== UserRole.ADMIN && event.organizerId !== organizerId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขงานนี้');
    }

    const submittedIds = new Set(dto.activities.map((a) => a.id).filter((id): id is number => !!id));
    const removedActivities = event.activities.filter((a: any) => !submittedIds.has(a.id));
    for (const removed of removedActivities) {
      if ((removed.registrations?.length ?? 0) > 0) {
        throw new BadRequestException(
          `ไม่สามารถลบกิจกรรม "${removed.name}" ได้ เนื่องจากมีผู้ลงทะเบียนแล้ว`,
        );
      }
    }

    const activities = dto.activities.map((a, index) => {
      const startAt = new Date(a.startAt);
      const endAt = new Date(a.endAt);

      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: รูปแบบวันที่ไม่ถูกต้อง`);
      }
      if (endAt <= startAt) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม`);
      }
      if (a.issueVolunteerCertificate && !a.volunteerRole?.trim()) {
        throw new BadRequestException(`กิจกรรมลำดับที่ ${index + 1}: กรุณาระบุชื่อการทำงานเพื่อออกใบจิตอาสา`);
      }

      const questions = (a.questions ?? []).map((q, qIndex) => {
        const needsOptions =
          q.type === ActivityQuestionType.SINGLE_CHOICE || q.type === ActivityQuestionType.MULTI_CHOICE;
        const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);

        if (needsOptions && options.length < 2) {
          throw new BadRequestException(
            `กิจกรรมลำดับที่ ${index + 1} คำถามข้อที่ ${qIndex + 1}: ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`,
          );
        }

        return { label: q.label, type: q.type, required: q.required ?? false, options: needsOptions ? options : [] };
      });

      return {
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        imageUrl: a.imageUrl,
        attachmentUrl: a.attachmentUrl,
        startAt,
        endAt,
        date: startAt,
        startTime: formatHHmm(startAt),
        endTime: formatHHmm(endAt),
        location: a.location,
        capacity: a.capacity,
        volunteerHours: a.issueVolunteerCertificate ? diffHours(startAt, endAt) : undefined,
        volunteerRole: a.issueVolunteerCertificate ? a.volunteerRole : undefined,
        softSkillRates: (a.softSkillRates ?? []).map((s) => ({ skillType: s.skillType, rate: s.rate })),
        questions,
      };
    });

    const surveyQuestions = (dto.surveyQuestions ?? []).map((q, index) => {
      if (q.type === SurveyQuestionType.RATING && q.scaleMax !== undefined && q.scaleMax < 2) {
        throw new BadRequestException(`คำถามแบบสำรวจข้อที่ ${index + 1}: คะแนนเต็มต้องมีอย่างน้อย 2`);
      }
      return { label: q.label, type: q.type, scaleMax: q.scaleMax ?? 5 };
    });

    const visibility = dto.visibility ?? EventVisibility.EVERYONE;

    const updated = await this.eventsRepository.update(
      eventId,
      {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isPublic: dto.isPublic ?? true,
        registrationCloseAt: dto.registrationCloseAt ? new Date(dto.registrationCloseAt) : undefined,
        activities,
        surveyQuestions,
        visibility,
        visibilityPrograms: visibility === EventVisibility.RESTRICTED ? (dto.visibilityPrograms ?? []) : [],
        visibilityYears: visibility === EventVisibility.RESTRICTED ? (dto.visibilityYears ?? []) : [],
        visibilityStudentIdFilter:
          visibility === EventVisibility.RESTRICTED ? dto.visibilityStudentIdFilter : undefined,
      },
      removedActivities.map((a: any) => a.id),
    );

    this.logger.log(`Event updated: "${updated.name}" (ID: ${eventId})`);
    return updated;
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx jest src/modules/shared/events/events.service.spec.ts`
Expected: 5 passing tests.

- [ ] **Step 5: Add the `PATCH /api/events/:id` route**

In `backend/src/modules/organizer/events-organizer.controller.ts`, add `Patch` to the `@nestjs/common` import list, add `UpdateEventDto` and `UserRole` imports (the `UserRole` import already exists), then add this method after `findById`:

```typescript
  /**
   * PATCH /api/events/:id - แก้ไขงาน (เจ้าของ / Admin)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขงาน (เจ้าของ / Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Body() updateDto: UpdateEventDto,
  ) {
    return this.eventsService.update(userId, userRole, id, updateDto);
  }
```

Add the import: `import { UpdateEventDto } from '../shared/events/dto/update-event.dto';`

- [ ] **Step 6: Manually verify the route**

Run: `cd backend && npm run start:dev` (if not already running), then in another terminal, with a valid organizer JWT and an existing event id that organizer owns:

```bash
curl -s -X PATCH http://localhost:3001/api/events/<id> \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Updated name","description":"Updated desc","activities":[{"id":<activityId>,"name":"A1","description":"d","category":"Technology","startAt":"2027-01-01T09:00:00.000Z","endAt":"2027-01-01T12:00:00.000Z","location":"Room 1"}]}'
```

Expected: `{"success":true,"data":{...,"name":"Updated name",...}}`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/shared/events/events.service.ts backend/src/modules/shared/events/events.service.spec.ts backend/src/modules/organizer/events-organizer.controller.ts
git commit -m "feat(events): add EventsService.update and PATCH /api/events/:id"
```

---

## Task 3: Public event read endpoints (`GET /api/events`, `GET /api/events/:id/public`)

**Files:**
- Create: `backend/src/modules/shared/events/events-public.controller.ts`
- Modify: `backend/src/modules/shared/events/events.repository.ts`
- Modify: `backend/src/modules/shared/events/events.service.ts`
- Modify: `backend/src/modules/shared/events/events.module.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/modules/shared/events/events.service.spec.ts` (extend)

**Interfaces:**
- Consumes: `isViewerEligibleForEvent`, `Viewer` (existing, `event-visibility.util.ts`); `OptionalJwtAuthGuard`, `CurrentUser` (existing, used identically in `activities-public.controller.ts`); `ApprovalStatus` (existing enum).
- Produces: `EventsRepository.findAllApproved(): Promise<EventWithRelations[]>`, `EventsRepository.findByIdIfHasApprovedActivity(id): Promise<EventWithRelations | null>` (both consumed only within `EventsService` in this task); `EventsService.findAllPublic(viewer): Promise<EventSummary[]>`, `EventsService.findByIdPublic(id, viewer): Promise<EventSummary>` (consumed by the new controller here, and — via HTTP — by Task 9/10's frontend student pages).

- [ ] **Step 1: Add repository queries**

Add to `EventsRepository` in `events.repository.ts`, after `findByOrganizer`:

```typescript
  /** งานที่มีอย่างน้อย 1 กิจกรรมย่อยที่ approved แล้ว — ใช้สำหรับรายการสาธารณะ */
  findAllApproved() {
    return this.prisma.event.findMany({
      where: { activities: { some: { approvalStatus: 'approved' as any } } },
      include: eventInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
```

- [ ] **Step 2: Add service methods**

Add to `EventsService` in `events.service.ts`, after `findByOrganizer`. Requires importing `Viewer`, `isViewerEligibleForEvent` from `./event-visibility.util` and `NotFoundException` (already imported for Task 2):

```typescript
  async findAllPublic(viewer: Viewer | null) {
    const events = await this.eventsRepository.findAllApproved();
    return events.filter((e: any) =>
      isViewerEligibleForEvent(viewer, e as any),
    );
  }

  async findByIdPublic(id: number, viewer: Viewer | null) {
    const event = await this.eventsRepository.findById(id);
    // ให้ error เดียวกับ "ไม่พบ" เสมอ ไม่ว่าจะไม่มีจริงๆ หรือมีแต่ไม่มีสิทธิ์เห็น
    if (!event || !isViewerEligibleForEvent(viewer, event as any)) {
      throw new NotFoundException(`ไม่พบงาน ID: ${id}`);
    }
    return event;
  }
```

Add the import line: `import { isViewerEligibleForEvent, Viewer } from './event-visibility.util';` — do not import `filterVisibleActivities`; it operates on `Activity[]`, not `Event[]`, and is not used here.

- [ ] **Step 3: Create the public controller**

```typescript
// backend/src/modules/shared/events/events-public.controller.ts
import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { Viewer } from './event-visibility.util';

@ApiTags('Events')
@Controller('api/events')
export class EventsPublicController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/events - ดูงานทั้งหมดที่เปิดสาธารณะ (Public — login แล้วเห็นงาน restricted ที่ตัวเองมีสิทธิ์ด้วย)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูงานทั้งหมด (เฉพาะที่มีกิจกรรมย่อยอนุมัติแล้วและมีสิทธิ์เห็น)' })
  async findAll(@CurrentUser() viewer: Viewer | null) {
    return this.eventsService.findAllPublic(viewer);
  }

  /**
   * GET /api/events/:id/public - ดูรายละเอียดงาน (Public)
   */
  @Get(':id/public')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายละเอียดงาน (Public)' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() viewer: Viewer | null) {
    return this.eventsService.findByIdPublic(id, viewer);
  }
}
```

- [ ] **Step 4: Wire the controller into the module and app**

`events.module.ts` currently exports only providers (no controllers, "mirrors ActivitiesModule so both organizer/admin/student modules can DI EventsService without route-order concerns" per its own comment). Check `backend/src/app.module.ts` for how `ActivitiesPublicController` is currently registered (likely directly in `AppModule.controllers` or a shared module) and register `EventsPublicController` the same way, alongside it. If `ActivitiesPublicController` is registered in `AppModule`'s `controllers` array, add `EventsPublicController` to the same array with a matching import line.

- [ ] **Step 5: Extend the service test**

Add to `events.service.spec.ts`:

```typescript
describe('EventsService.findByIdPublic', () => {
  let service: EventsService;
  let repo: { findById: jest.Mock };

  beforeEach(async () => {
    repo = { findById: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [EventsService, { provide: EventsRepository, useValue: repo }],
    }).compile();
    service = module.get(EventsService);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findByIdPublic(1, null)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the viewer is not eligible for a restricted event', async () => {
    repo.findById.mockResolvedValue({
      id: 1,
      visibility: 'restricted',
      visibilityStudentIdFilter: null,
      visibilityProgram: [{ programCode: 'CS' }],
      visibilityYears: [],
    });
    await expect(
      service.findByIdPublic(1, { role: 'student', studentId: '653380001-1', program: 'IT' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns the event when visibility is everyone', async () => {
    const event = { id: 1, visibility: 'everyone', visibilityProgram: [], visibilityYears: [] };
    repo.findById.mockResolvedValue(event);
    await expect(service.findByIdPublic(1, null)).resolves.toBe(event);
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `cd backend && npx jest src/modules/shared/events/events.service.spec.ts`
Expected: 8 passing tests total.

- [ ] **Step 7: Manually verify the routes**

Run: `curl -s http://localhost:3001/api/events` → expect `{"success":true,"data":[...]}` listing events with ≥1 approved activity.
Run: `curl -s http://localhost:3001/api/events/<id>/public` → expect the single event.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/shared/events/events-public.controller.ts backend/src/modules/shared/events/events.repository.ts backend/src/modules/shared/events/events.service.ts backend/src/modules/shared/events/events.service.spec.ts backend/src/app.module.ts
git commit -m "feat(events): add public GET /api/events and GET /api/events/:id/public"
```

---

## Task 4: Frontend `eventsAPI` additions + `resolveEventImageUrl` helper

**Files:**
- Modify: `frontend/lib/api.ts`
- Create: `frontend/lib/event-image.ts`

**Interfaces:**
- Consumes: `API_BASE_URL`, `EventSummary`, `Activity`, `CreateEventBody` (existing, `lib/api.ts`).
- Produces: `eventsAPI.update(id, body): Promise<EventSummary>`, `eventsAPI.getAllPublic(): Promise<EventSummary[]>`, `eventsAPI.getPublicById(id): Promise<EventSummary>` (consumed by Tasks 7, 9, 10); `resolveEventImageUrl(event: {imageUrl?: string|null}, activity?: {imageUrl?: string|null}|null): string` (consumed by Tasks 6, 8, 9, 10).

- [ ] **Step 1: Add the three `eventsAPI` methods**

In `frontend/lib/api.ts`, inside the `eventsAPI` object (after `getById`), add:

```typescript
  update: (id: number, body: Partial<CreateEventBody> & { activities: (CreateEventActivityBody & { id?: number })[] }) =>
    fetchAPI<EventSummary>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getAllPublic: () => fetchAPI<EventSummary[]>('/api/events'),
  getPublicById: (id: number) => fetchAPI<EventSummary>(`/api/events/${id}/public`),
```

- [ ] **Step 2: Write `resolveEventImageUrl`**

```typescript
// frontend/lib/event-image.ts
import { API_BASE_URL } from "./api"

interface ImageSource {
    imageUrl?: string | null
}

/**
 * ลำดับการเลือกรูปที่แสดง: รูปหน้าปกงาน (Event) -> รูปกิจกรรมย่อยแรก (Activity) -> placeholder
 * เดิมแต่ละหน้าอ่านแค่ Activity.imageUrl อย่างเดียว ทำให้รูปหน้าปกงานที่ตั้งไว้ตอนสร้างไม่แสดงที่ไหนเลย
 */
export function resolveEventImageUrl(event: ImageSource | null | undefined, activity?: ImageSource | null): string {
    const raw = event?.imageUrl ?? activity?.imageUrl
    return raw ? `${API_BASE_URL}${raw}` : "/activity-placeholder.svg"
}
```

- [ ] **Step 3: Manually verify**

Run: `cd frontend && npm run lint` — expect no new errors from `api.ts`/`event-image.ts`.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api.ts frontend/lib/event-image.ts
git commit -m "feat(frontend): add eventsAPI.update/getAllPublic/getPublicById and resolveEventImageUrl"
```

---

## Task 5: Extract shared event-form validation module

**Files:**
- Create: `frontend/app/organizer/create/_components/validation.ts`
- Modify: `frontend/app/organizer/create/page.tsx`

**Interfaces:**
- Consumes: `EventFormState`, `ActivityFormState`, `EventFormErrors`, `ActivityFormErrors` (existing, `./types`).
- Produces: `validateEventField`, `validateEventFields`, `validateActivityField`, `validateActivityFields`, `validateAllActivities`, `countErrors`, `ACTIVITY_FIELDS` (all moved verbatim from `create/page.tsx`) — consumed by `create/page.tsx` (this task) and Task 7's edit page.

- [ ] **Step 1: Create `validation.ts` with the functions moved verbatim from `create/page.tsx` lines 32-99**

```typescript
// frontend/app/organizer/create/_components/validation.ts
import type { EventFormState, ActivityFormState, EventFormErrors, ActivityFormErrors } from "./types"

export function validateEventField(event: EventFormState, field: keyof EventFormErrors): string | undefined {
    switch (field) {
        case "name":
            return event.name.trim() ? undefined : "กรุณากรอกชื่องาน"
        case "description":
            return event.description.trim() ? undefined : "กรุณากรอกรายละเอียดงาน"
    }
}

export function validateEventFields(event: EventFormState): EventFormErrors {
    const errors: EventFormErrors = {}
    const nameErr = validateEventField(event, "name")
    if (nameErr) errors.name = nameErr
    const descErr = validateEventField(event, "description")
    if (descErr) errors.description = descErr
    return errors
}

export function validateActivityField(a: ActivityFormState, field: keyof ActivityFormErrors): string | undefined {
    switch (field) {
        case "name":
            return a.name.trim() ? undefined : "กรุณากรอกชื่อกิจกรรม"
        case "category":
            return a.category ? undefined : "กรุณาเลือกหมวดหมู่"
        case "description":
            return a.description.trim() ? undefined : "กรุณากรอกรายละเอียด"
        case "startAt":
            return a.startAt ? undefined : "กรุณาระบุวันเวลาเริ่ม"
        case "endAt":
            if (!a.endAt) return "กรุณาระบุวันเวลาสิ้นสุด"
            if (a.startAt && new Date(a.endAt) <= new Date(a.startAt)) return "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม"
            return undefined
        case "location":
            return a.location.trim() ? undefined : "กรุณากรอกสถานที่"
        case "capacity":
            if (!a.capacityEnabled) return undefined
            return !a.capacity || parseInt(a.capacity) < 1 ? "กรุณาระบุจำนวนที่รับ" : undefined
        case "volunteerRole":
            if (!a.certEnabled) return undefined
            return a.volunteerRole.trim() ? undefined : "กรุณาระบุชื่อบทบาทสำหรับใบจิตอาสา"
    }
}

export const ACTIVITY_FIELDS: (keyof ActivityFormErrors)[] = [
    "name", "category", "description", "startAt", "endAt", "location", "capacity", "volunteerRole",
]

export function validateActivityFields(a: ActivityFormState): ActivityFormErrors {
    const errors: ActivityFormErrors = {}
    for (const field of ACTIVITY_FIELDS) {
        const message = validateActivityField(a, field)
        if (message) errors[field] = message
    }
    return errors
}

export function validateAllActivities(activities: ActivityFormState[]): Record<string, ActivityFormErrors> {
    const map: Record<string, ActivityFormErrors> = {}
    for (const a of activities) {
        const errs = validateActivityFields(a)
        if (Object.keys(errs).length > 0) map[a.key] = errs
    }
    return map
}

export function countErrors(errors: Record<string, string | undefined>): number {
    return Object.values(errors).filter(Boolean).length
}
```

- [ ] **Step 2: Update `create/page.tsx` to import from the new module instead of defining these functions**

Delete lines 32-99 of `create/page.tsx` (the `validateEventField` through `countErrors` function definitions), and add this import alongside the existing `./_components/types` import:

```typescript
import {
    validateEventField,
    validateEventFields,
    validateActivityField,
    validateActivityFields,
    validateAllActivities,
    countErrors,
} from "./_components/validation"
```

- [ ] **Step 3: Manually verify the create wizard still works**

Run: `cd frontend && npm run dev`, navigate to `/organizer/create`, fill step 1 with an empty name, click ถัดไป — expect the red-border/error-text validation to still trigger exactly as before.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/organizer/create/_components/validation.ts frontend/app/organizer/create/page.tsx
git commit -m "refactor(organizer): extract event/activity form validation into a shared module"
```

---

## Task 6: `EventCard` prop relaxation + `/organizer/manage` rebuild

**Files:**
- Modify: `frontend/components/ui/event-card.tsx`
- Modify: `frontend/app/organizer/manage/page.tsx`

**Interfaces:**
- Consumes: `eventsAPI.getMy` (existing), `activitiesAPI.getMy` (existing), `resolveEventImageUrl` (Task 4), `EventSummary`, `Activity` (existing, `lib/api.ts`), `EventCard`/`EventCardBadge`/`EventCardRow`/`EventCardProgress`/`formatEventDate` (this task + existing).
- Produces: `EventCardProps.activity` retyped to `{ name: string; imageUrl?: string | null }` (a structural subset both `Activity` and `EventSummary` satisfy) — no other file needs to change to keep compiling, since both existing callers (`student/events/page.tsx`, this task's rebuilt `manage/page.tsx`) already pass full `Activity` objects, which still satisfy the narrower type.

- [ ] **Step 1: Relax `EventCardProps.activity`'s type**

In `frontend/components/ui/event-card.tsx`, change:

```typescript
interface EventCardProps {
    activity: Activity
```

to:

```typescript
interface EventCardProps {
    /** ต้องมีอย่างน้อย name + imageUrl — รับได้ทั้ง Activity และ EventSummary */
    activity: { name: string; imageUrl?: string | null }
```

Remove the now-unused `Activity` import if nothing else in the file uses it (check with a search for `Activity` elsewhere in the file — `formatEventDate` doesn't reference it).

- [ ] **Step 2: Rewrite `/organizer/manage/page.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/layout/container"
import {
    EventCard,
    EventCardBadge,
    EventCardProgress,
    EventCardRow,
    formatEventDate,
} from "@/components/ui/event-card"
import { eventsAPI, activitiesAPI, EventSummary, Activity } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { Calendar, MapPin, Clock, Loader2, Search, Plus, Layers } from "lucide-react"

/** สถานะการอนุมัติของกิจกรรมย่อย — ตรงกับ ApprovalStatus ใน backend/prisma/schema.prisma */
const APPROVAL_META: Record<string, { label: string; className: string }> = {
    approved: { label: "อนุมัติแล้ว", className: "bg-success/90" },
    pending_approval: { label: "รออนุมัติ", className: "bg-warning/90" },
    rejected: { label: "ยกเลิกแล้ว", className: "bg-danger/90" },
}

function eventRegisteredCount(ev: EventSummary): number {
    return ev.activities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0)
}

function eventCapacity(ev: EventSummary): number | null {
    if (ev.activities.some((a) => a.capacity == null)) return null
    return ev.activities.reduce((sum, a) => sum + (a.capacity ?? 0), 0)
}

/** เรียงตามวันจัดกิจกรรมย่อยแรกที่ใกล้ที่สุด — ใช้แสดงในการ์ดของ Event */
function firstActivity(ev: EventSummary): Activity | undefined {
    return [...ev.activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

/** หน้าจัดการกิจกรรมของผู้จัด — แสดงเป็น "งาน" (Event) พร้อมกิจกรรมย่อย, และกิจกรรมเดี่ยวรุ่นเก่าแยกไว้ด้านล่าง */
export default function OrganizerManagePage() {
    const [events, setEvents] = useState<EventSummary[]>([])
    const [standaloneActivities, setStandaloneActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const [eventData, activityData] = await Promise.all([eventsAPI.getMy(), activitiesAPI.getMy()])
            setEvents(Array.isArray(eventData) ? eventData : [])
            setStandaloneActivities(Array.isArray(activityData) ? activityData.filter((a) => !a.eventId) : [])
        } catch (err) {
            console.error(err)
            setEvents([])
            setStandaloneActivities([])
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = events.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const filteredStandalone = standaloneActivities.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalCount = filteredEvents.length + filteredStandalone.length

    return (
        // ไม่ใส่ min-h-screen — app/organizer/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-fg mb-2">จัดการกิจกรรม</h1>
                        <p className="text-fg-muted">แก้ไข ดูรายละเอียด และติดตามยอดผู้ลงทะเบียนของงานที่คุณสร้าง</p>
                    </div>

                    <Button asChild size="lg" className="w-full md:w-auto font-bold rounded-xl">
                        <Link href="/organizer/create">
                            <Plus />
                            สร้างงานใหม่
                        </Link>
                    </Button>
                </div>

                <div className="mb-10 w-full md:w-80">
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-fg-subtle" />
                        <Input
                            type="text"
                            placeholder="ค้นหางาน..."
                            className="pl-10 h-12 rounded-xl shadow-sm focus-visible:ring-brand-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {!loading && (
                    <p className="mb-4 text-sm text-fg-muted">
                        พบ <span className="font-semibold text-fg">{totalCount}</span> รายการ
                    </p>
                )}

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมของคุณ...</p>
                    </div>
                ) : totalCount > 0 ? (
                    <div className="space-y-12">
                        {filteredEvents.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredEvents.map((ev) => {
                                    const fa = firstActivity(ev)
                                    const capacity = eventCapacity(ev)
                                    return (
                                        <EventCard
                                            key={`event-${ev.id}`}
                                            activity={{ name: ev.name, imageUrl: ev.imageUrl ?? fa?.imageUrl }}
                                            badgeLeft={
                                                ev.activities.length > 1 ? (
                                                    <EventCardBadge variant="light">
                                                        <Layers className="mr-1 inline size-3" aria-hidden="true" />
                                                        {ev.activities.length} กิจกรรมย่อย
                                                    </EventCardBadge>
                                                ) : undefined
                                            }
                                            badgeRight={
                                                <EventCardBadge className={ev.isPublic ? "bg-success/90" : "bg-fg-subtle/90"}>
                                                    {ev.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}
                                                </EventCardBadge>
                                            }
                                            actions={
                                                <>
                                                    <Link href={`/organizer/manage/${ev.id}/edit`} className="flex-1">
                                                        <Button variant="outline" className="w-full font-bold rounded-xl h-11">แก้ไข</Button>
                                                    </Link>
                                                    <Link href={`/organizer/events/${ev.id}`} className="flex-1">
                                                        <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                                    </Link>
                                                </>
                                            }
                                        >
                                            {fa && (
                                                <EventCardRow icon={Calendar} tone="brand">
                                                    {formatEventDate(fa.date)}
                                                </EventCardRow>
                                            )}
                                            {fa && (
                                                <EventCardRow icon={Clock} tone="info">
                                                    {fa.startTime} - {fa.endTime}
                                                </EventCardRow>
                                            )}
                                            <EventCardProgress registered={eventRegisteredCount(ev)} capacity={capacity} />
                                        </EventCard>
                                    )
                                })}
                            </div>
                        )}

                        {filteredStandalone.length > 0 && (
                            <div>
                                <h2 className="mb-4 text-lg font-bold text-fg">กิจกรรมเดี่ยว (ไม่ผูกกับงาน)</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredStandalone.map((ev) => {
                                        const ap = APPROVAL_META[ev.approvalStatus] ?? APPROVAL_META.pending_approval
                                        return (
                                            <EventCard
                                                key={`activity-${ev.id}`}
                                                activity={ev}
                                                badgeRight={<EventCardBadge className={ap.className}>{ap.label}</EventCardBadge>}
                                                actions={
                                                    <Link href={`/organizer/events/${ev.id}`} className="flex-1">
                                                        <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                                    </Link>
                                                }
                                            >
                                                <EventCardRow icon={Calendar} tone="brand">
                                                    {formatEventDate(ev.date)}
                                                </EventCardRow>
                                                <EventCardRow icon={MapPin} tone="danger">
                                                    <span className="truncate">{ev.location}</span>
                                                </EventCardRow>
                                                <EventCardProgress registered={ev.registeredCount ?? 0} capacity={ev.capacity} />
                                            </EventCard>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-bg rounded-3xl border border-border shadow-sm mt-8">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                            {events.length === 0 && standaloneActivities.length === 0
                                ? <Plus className="w-10 h-10 text-fg-subtle" />
                                : <Search className="w-10 h-10 text-fg-subtle" />}
                        </div>
                        {events.length === 0 && standaloneActivities.length === 0 ? (
                            <>
                                <h3 className="text-xl font-bold text-fg mb-2">ยังไม่มีงาน</h3>
                                <p className="text-fg-muted">เริ่มต้นด้วยการสร้างงานแรกของคุณ</p>
                                <Button asChild className="mt-6 rounded-full px-8">
                                    <Link href="/organizer/create">สร้างงานใหม่</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-fg mb-2">ไม่พบกิจกรรมที่ค้นหา</h3>
                                <p className="text-fg-muted">ลองใช้คำค้นหาอื่น หรือล้างการค้นหาเพื่อดูกิจกรรมทั้งหมด</p>
                                <Button
                                    variant="outline"
                                    className="mt-6 rounded-full px-8"
                                    onClick={() => setSearchQuery("")}
                                >
                                    ล้างการค้นหา
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </Container>
        </div>
    )
}
```

Note the `EventCard activity={{ name: ev.name, imageUrl: ... }}` line resolves the cover image inline: since `EventCard` internally does its own `imageUrl ? ... : placeholder` check (it doesn't call `resolveEventImageUrl` itself — that would double-prefix `API_BASE_URL`), pass the *raw* `imageUrl` (`ev.imageUrl ?? fa?.imageUrl`), not a resolved absolute URL. The code block above already does this correctly.

- [ ] **Step 3: Manually verify**

Run: `cd frontend && npm run dev`, log in as the test organizer, visit `/organizer/manage`. Expect: Events (created via the wizard) show grouped as one card each with the correct cover image (test this specifically against an event where only the Event-level cover was set and no per-activity image — this is the exact bug being fixed), standalone legacy activities (if any exist in the DB) show in their own labeled section below, `แก้ไข`/`ดูรายละเอียด` links navigate correctly.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/event-card.tsx frontend/app/organizer/manage/page.tsx
git commit -m "feat(organizer): rebuild /organizer/manage around Events instead of flat Activities"
```

---

## Task 7: `/organizer/manage/[id]/edit` full rewrite

**Files:**
- Modify: `frontend/app/organizer/manage/[id]/edit/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `eventsAPI.getById`, `eventsAPI.update` (Task 4), `StepperSidebar`, `SectionEventBasics`, `SectionActivities`, `SectionSurvey`, `SectionPublish` (existing, `../../create/_components/*`), `EventFormState`, `ActivityFormState`, `createEmptyEvent` (existing, `../../create/_components/types`), validation functions (Task 5), `API_BASE_URL`, `EventSummary` (existing, `lib/api.ts`), `scrollToFirstError` (existing, `components/ui/form-field`).
- Produces: nothing consumed elsewhere — this is a leaf page.

- [ ] **Step 1: Write the full replacement**

```tsx
// frontend/app/organizer/manage/[id]/edit/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ArrowLeft, Loader2, Edit } from "lucide-react"
import { eventsAPI, API_BASE_URL, type CreateEventActivityBody, type QuestionBody, type SurveyQuestionBody, type EventSummary } from "@/lib/api"
import { scrollToFirstError } from "@/components/ui/form-field"
import { StepperSidebar, type StepMeta } from "../../../create/_components/stepper-sidebar"
import { SectionEventBasics } from "../../../create/_components/section-1-event-basics"
import { SectionActivities } from "../../../create/_components/section-2-activities"
import { SectionSurvey } from "../../../create/_components/section-3-survey"
import { SectionPublish } from "../../../create/_components/section-4-publish"
import type { EventFormState, ActivityFormState, EventFormErrors, ActivityFormErrors } from "../../../create/_components/types"
import {
    validateEventFields,
    validateAllActivities,
    countErrors,
} from "../../../create/_components/validation"

const STEPS: StepMeta[] = [
    { number: 1, title: "ข้อมูลพื้นฐาน", subtitle: "ชื่อและรายละเอียดงาน" },
    { number: 2, title: "กิจกรรมย่อย", subtitle: "รายละเอียดแต่ละกิจกรรม" },
    { number: 3, title: "แบบสำรวจ", subtitle: "คำถามหลังจบกิจกรรม" },
    { number: 4, title: "เผยแพร่", subtitle: "ตรวจสอบและยืนยัน" },
]

let activityKeySeq = 0
function keyFor(activityId: number): string {
    activityKeySeq += 1
    return `activity-${activityId}-${activityKeySeq}`
}

/** map ข้อมูลจาก backend (EventSummary) กลับเป็น form state ของ wizard — ฝั่ง client เก็บ id ไว้ใน key ผ่าน map แยกต่างหาก */
function eventToFormState(event: EventSummary): EventFormState {
    return {
        name: event.name,
        description: event.description,
        imageFile: null,
        imagePreview: event.imageUrl ? `${API_BASE_URL}${event.imageUrl}` : null,
        isPublic: event.isPublic,
        registrationCloseAt: event.registrationCloseAt ? event.registrationCloseAt.slice(0, 16) : "",
        surveyQuestions: (event.surveyQuestions ?? []).map((q) => ({
            label: q.label,
            type: q.type,
            scaleMax: q.scaleMax,
        })),
        visibility: (event.visibility as "everyone" | "restricted") ?? "everyone",
        visibilityPrograms: [],
        visibilityYears: [],
        visibilityStudentIdFilter: "",
    }
}

function activityToFormState(a: EventSummary["activities"][number]): ActivityFormState & { activityId: number } {
    const softSkillRates: Record<string, number> = {}
    for (const s of a.softSkills ?? []) {
        if (s.rate !== undefined) softSkillRates[s.skillType] = s.rate
    }
    return {
        key: keyFor(a.id),
        activityId: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        imageFile: null,
        imagePreview: a.imageUrl ? `${API_BASE_URL}${a.imageUrl}` : null,
        attachmentFile: null,
        attachmentName: a.attachmentUrl ? a.attachmentUrl.split("/").pop() ?? null : null,
        startAt: a.startAt ? a.startAt.slice(0, 16) : "",
        endAt: a.endAt ? a.endAt.slice(0, 16) : "",
        location: a.location,
        capacityEnabled: a.capacity != null,
        capacity: a.capacity != null ? String(a.capacity) : "",
        certEnabled: !!a.volunteerRole,
        volunteerRole: a.volunteerRole ?? "",
        softSkillsEnabled: Object.keys(softSkillRates).length > 0,
        softSkillRates,
        questionsEnabled: (a.questions?.length ?? 0) > 0,
        questions: (a.questions ?? []).map((q) => ({
            label: q.label,
            type: q.type,
            required: q.required,
            options: q.options?.map((o) => o.label) ?? [],
        })),
    }
}

export default function EditEventPage() {
    const router = useRouter()
    const params = useParams()
    const eventId = Number(params?.id)

    const [step, setStep] = useState(1)
    const [loadingData, setLoadingData] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [event, setEvent] = useState<EventFormState | null>(null)
    // เก็บ activityId คู่กับ key เพื่อรู้ว่าแท็บไหนคือกิจกรรมเดิม (ส่ง id กลับไป) กับแท็บไหนเพิ่มใหม่ (ไม่ส่ง id)
    const [activities, setActivities] = useState<(ActivityFormState & { activityId?: number })[]>([])
    const [activeActivityKey, setActiveActivityKey] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [eventErrors, setEventErrors] = useState<EventFormErrors>({})
    const [activityErrors, setActivityErrors] = useState<Record<string, ActivityFormErrors>>({})

    useEffect(() => {
        if (!eventId || Number.isNaN(eventId)) return
        eventsAPI
            .getById(eventId)
            .then((data) => {
                setEvent(eventToFormState(data))
                const mapped = data.activities.map(activityToFormState)
                setActivities(mapped)
                setActiveActivityKey(mapped[0]?.key ?? "")
            })
            .catch((err: unknown) => {
                const e = err as Error
                setLoadError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
            })
            .finally(() => setLoadingData(false))
    }, [eventId])

    function patchEvent(patch: Partial<EventFormState>) {
        setEvent((prev) => (prev ? { ...prev, ...patch } : prev))
    }

    function patchActivity(key: string, patch: Partial<ActivityFormState>) {
        setActivities((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))
    }

    function handleEventFieldBlur(field: keyof EventFormErrors) {
        if (!event) return
        const errs = validateEventFields(event)
        setEventErrors((prev) => ({ ...prev, [field]: errs[field] }))
    }

    function handleActivityFieldBlur(key: string, field: keyof ActivityFormErrors) {
        const activity = activities.find((a) => a.key === key)
        if (!activity) return
        const errs = validateAllActivities([activity])[key] ?? {}
        setActivityErrors((prev) => ({ ...prev, [key]: { ...prev[key], [field]: errs[field] } }))
    }

    function handleAddActivity() {
        activityKeySeq += 1
        const next: ActivityFormState & { activityId?: number } = {
            key: `activity-new-${activityKeySeq}`,
            name: "",
            description: "",
            category: "",
            imageFile: null,
            imagePreview: null,
            attachmentFile: null,
            attachmentName: null,
            startAt: "",
            endAt: "",
            location: "",
            capacityEnabled: false,
            capacity: "",
            certEnabled: false,
            volunteerRole: "",
            softSkillsEnabled: false,
            softSkillRates: {},
            questionsEnabled: false,
            questions: [],
        }
        setActivities((prev) => [...prev, next])
        setActiveActivityKey(next.key)
    }

    function handleRemoveActivity(key: string) {
        const next = activities.filter((a) => a.key !== key)
        setActivities(next)
        if (activeActivityKey === key) setActiveActivityKey(next[0]?.key ?? "")
    }

    function handleBack() {
        if (step === 1) {
            router.push("/organizer/manage")
            return
        }
        setError("")
        setStep((prev) => prev - 1)
    }

    function handleNext() {
        if (!event) return
        if (step === 1) {
            const errs = validateEventFields(event)
            setEventErrors(errs)
            if (countErrors(errs) > 0) {
                setError(`มี ${countErrors(errs)} ฟิลด์ที่ต้องแก้ไข`)
                scrollToFirstError(errs)
                return
            }
        } else if (step === 2) {
            if (activities.length === 0) {
                setError("ต้องมีอย่างน้อย 1 กิจกรรม")
                return
            }
            const errsByKey = validateAllActivities(activities)
            setActivityErrors(errsByKey)
            const total = Object.values(errsByKey).reduce((sum, e) => sum + countErrors(e), 0)
            if (total > 0) {
                setError(`มี ${total} ฟิลด์ที่ต้องแก้ไข`)
                const firstKey = Object.keys(errsByKey)[0]
                if (firstKey) setActiveActivityKey(firstKey)
                scrollToFirstError(errsByKey[firstKey] ?? {})
                return
            }
        }
        setError("")
        setStep((prev) => Math.min(prev + 1, STEPS.length))
    }

    async function handleSave() {
        if (!event) return
        const eventErrs = validateEventFields(event)
        const activityErrsByKey = validateAllActivities(activities)
        setEventErrors(eventErrs)
        setActivityErrors(activityErrsByKey)
        const total = countErrors(eventErrs) + Object.values(activityErrsByKey).reduce((sum, e) => sum + countErrors(e), 0)
        if (total > 0) {
            setError(`มี ${total} ฟิลด์ที่ต้องแก้ไข`)
            return
        }

        setSubmitting(true)
        setError("")
        try {
            let eventImageUrl: string | undefined = event.imagePreview?.startsWith(API_BASE_URL)
                ? event.imagePreview.slice(API_BASE_URL.length)
                : undefined
            if (event.imageFile) {
                const uploadRes = await (await import("@/lib/api")).activitiesAPI.uploadImage(event.imageFile)
                eventImageUrl = uploadRes?.imageUrl
            }

            const activityBodies: (CreateEventActivityBody & { id?: number })[] = []
            for (const a of activities) {
                let imageUrl: string | undefined = a.imagePreview?.startsWith(API_BASE_URL)
                    ? a.imagePreview.slice(API_BASE_URL.length)
                    : undefined
                if (a.imageFile) {
                    const uploadRes = await (await import("@/lib/api")).activitiesAPI.uploadImage(a.imageFile)
                    imageUrl = uploadRes?.imageUrl
                }

                let attachmentUrl: string | undefined = a.attachmentName ? undefined : undefined
                if (a.attachmentFile) {
                    const uploadRes = await (await import("@/lib/api")).eventsAPI.uploadAttachment(a.attachmentFile)
                    attachmentUrl = uploadRes?.attachmentUrl
                }

                const questions: QuestionBody[] | undefined = a.questionsEnabled
                    ? a.questions.map((q) => ({ label: q.label, type: q.type as QuestionBody["type"], required: q.required, options: q.options }))
                    : undefined

                activityBodies.push({
                    id: (a as { activityId?: number }).activityId,
                    name: a.name,
                    description: a.description,
                    category: a.category,
                    imageUrl,
                    attachmentUrl,
                    startAt: new Date(a.startAt).toISOString(),
                    endAt: new Date(a.endAt).toISOString(),
                    location: a.location,
                    capacity: a.capacityEnabled ? parseInt(a.capacity) : undefined,
                    issueVolunteerCertificate: a.certEnabled || undefined,
                    volunteerRole: a.certEnabled ? a.volunteerRole : undefined,
                    softSkillRates: a.softSkillsEnabled
                        ? Object.entries(a.softSkillRates).map(([skillType, rate]) => ({ skillType, rate }))
                        : undefined,
                    questions,
                })
            }

            const surveyQuestions: SurveyQuestionBody[] = event.surveyQuestions.map((q) => ({
                label: q.label,
                type: q.type as SurveyQuestionBody["type"],
                scaleMax: q.scaleMax,
            }))

            await eventsAPI.update(eventId, {
                name: event.name,
                description: event.description,
                imageUrl: eventImageUrl,
                isPublic: event.isPublic,
                registrationCloseAt: event.registrationCloseAt ? new Date(event.registrationCloseAt).toISOString() : undefined,
                activities: activityBodies,
                surveyQuestions,
                visibility: event.visibility,
                visibilityPrograms: event.visibility === "restricted" ? event.visibilityPrograms : undefined,
                visibilityYears: event.visibility === "restricted" ? event.visibilityYears : undefined,
                visibilityStudentIdFilter: event.visibility === "restricted" ? event.visibilityStudentIdFilter || undefined : undefined,
            })

            router.push("/organizer/manage")
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "บันทึกการแก้ไขไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingData) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
                    <p className="text-lg font-medium text-fg-muted">กำลังโหลดข้อมูลงาน...</p>
                </Container>
            </div>
        )
    }

    if (loadError || !event) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{loadError || "ไม่พบข้อมูลงาน"}</p>
                    <Button variant="outline" asChild>
                        <a href="/organizer/manage">กลับไปหน้าจัดการกิจกรรม</a>
                    </Button>
                </Container>
            </div>
        )
    }

    return (
        <div className="bg-surface">
            <Container className="py-10">
                <div className="mb-8 flex items-center">
                    <Button variant="ghost" onClick={handleBack} className="mr-4">
                        <ArrowLeft className="size-4" />
                        กลับ
                    </Button>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-black text-fg">
                            <div className="rounded-lg bg-brand-100 p-2 text-brand-600">
                                <Edit className="size-5" />
                            </div>
                            แก้ไขงาน
                        </h1>
                        <p className="mt-1 text-fg-muted">แก้ไขข้อมูลงานและกิจกรรมย่อยทั้งหมด</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
                    <StepperSidebar steps={STEPS} currentStep={step} className="hidden md:flex" />

                    <div>
                        <div className="min-h-[500px] rounded-2xl border border-border bg-bg p-8 shadow-xs">
                            {error && (
                                <div className="mb-6 rounded-lg border border-danger bg-danger-bg px-4 py-3 text-center text-sm text-danger">
                                    {error}
                                </div>
                            )}

                            {step === 1 && (
                                <SectionEventBasics data={event} errors={eventErrors} onChange={patchEvent} onFieldBlur={handleEventFieldBlur} />
                            )}
                            {step === 2 && (
                                <SectionActivities
                                    activities={activities}
                                    activeKey={activeActivityKey}
                                    errorsByKey={activityErrors}
                                    onActiveKeyChange={setActiveActivityKey}
                                    onChangeActivity={patchActivity}
                                    onFieldBlur={handleActivityFieldBlur}
                                    onAdd={handleAddActivity}
                                    onRemove={handleRemoveActivity}
                                />
                            )}
                            {step === 3 && <SectionSurvey event={event} onChange={patchEvent} />}
                            {step === 4 && <SectionPublish event={event} activities={activities} onChangeEvent={patchEvent} />}
                        </div>

                        <div className="mt-6 flex justify-between">
                            <Button variant="outline" onClick={handleBack}>
                                {step === 1 ? "ยกเลิก" : "ก่อนหน้า"}
                            </Button>
                            <Button onClick={step === STEPS.length ? handleSave : handleNext} disabled={submitting} className="w-36">
                                {submitting ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : step === STEPS.length ? (
                                    "บันทึกการแก้ไข"
                                ) : (
                                    "ถัดไป"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}
```

Note: the dynamic `await import("@/lib/api")` calls for `uploadImage`/`uploadAttachment` are a workaround only if a circular-import issue surfaces between this file and `lib/api.ts` — check first whether a plain top-level `import { activitiesAPI, eventsAPI, ... } from "@/lib/api"` works without issue (it should, since `create/page.tsx` already does this successfully); if so, simplify by adding `activitiesAPI` to the top-level import list and removing all three `await import(...)` indirections, calling `activitiesAPI.uploadImage(...)` / `eventsAPI.uploadAttachment(...)` directly instead.

- [ ] **Step 2: Manually verify**

Run: `cd frontend && npm run dev`, go to `/organizer/manage`, click แก้ไข on an event with 2 activities. Expect: all 4 steps pre-filled with the existing data (name, description, cover image preview, each activity's fields including soft skills/questions/cert role, survey questions, visibility settings). Change the event name, save, expect redirect to `/organizer/manage` and the new name reflected there. Then edit again and remove one activity that has zero registrations — expect it to save successfully and disappear from the list. Then try removing an activity that a test student has registered for — expect a 400 error surfaced in the red banner naming that activity, and the edit to NOT silently succeed.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/organizer/manage/[id]/edit/page.tsx"
git commit -m "feat(organizer): rebuild edit page onto the Event wizard components"
```

---

## Task 8: `/organizer/events/[id]` detail page rebuild

**Files:**
- Modify: `frontend/app/organizer/events/[id]/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `eventsAPI.getById` (existing), `resolveEventImageUrl` (Task 4), `registrationsAPI.confirm`/`checkIn` (existing), `activitiesAPI.requestCancel` (existing), `EventSummary` (existing), `softSkillLabel` (existing, `lib/soft-skills`), `categoryLabel` (existing, `lib/categories`).
- Produces: nothing consumed elsewhere — leaf page.

- [ ] **Step 1: Write the full replacement**

```tsx
// frontend/app/organizer/events/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Tag, Info, CheckCircle, Edit, CheckSquare, Download, Loader2, Award } from "lucide-react"
import Link from "next/link"
import { eventsAPI, registrationsAPI, activitiesAPI, isUnlimitedCapacity, EventSummary, API_BASE_URL } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { softSkillLabel } from "@/lib/soft-skills"
import { categoryLabel } from "@/lib/categories"

type EventActivity = EventSummary["activities"][number]

export default function OrganizerEventDetailsPage() {
    const params = useParams()
    const id = Number(params?.id)
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState("")

    useEffect(() => {
        if (id) fetchEventDetails(id)
    }, [id])

    const fetchEventDetails = async (eventId: number) => {
        try {
            setLoading(true)
            const data = await eventsAPI.getById(eventId)
            setEvent(data)
            setActiveActivityId((prev) => prev ?? data.activities[0]?.id ?? null)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const activeActivity: EventActivity | undefined = event?.activities.find((a) => a.id === activeActivityId)

    const handleShare = () => {
        if (!event) return
        const publicUrl = `${window.location.origin}/events/${event.id}`
        navigator.clipboard.writeText(publicUrl)
        alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")
    }

    const exportCSV = () => {
        if (!activeActivity?.registrations || activeActivity.registrations.length === 0) return
        const headers = ["ลำดับ", "ชื่อ-นามสกุล", "รหัสนักศึกษา", "อีเมล", "สถานะการลงทะเบียน", "เช็คอิน"]
        const rows = (activeActivity.registrations as any[]).map((reg, idx) => [
            idx + 1,
            reg.student?.name || "-",
            reg.student?.studentId || "-",
            reg.student?.email || "-",
            reg.status === "confirmed" ? "ยืนยันแล้ว" : "รอดำเนินการ",
            reg.attendance === "attended" ? "เข้าร่วมแล้ว" : "ยังไม่เช็คอิน",
        ])
        const csvContent = [
            `งาน: ${event?.name}`,
            `กิจกรรมย่อย: ${activeActivity.name}`,
            `วันที่จัด: ${formatEventDate(activeActivity.date)}  เวลา: ${activeActivity.startTime} - ${activeActivity.endTime}`,
            `สถานที่: ${activeActivity.location}`,
            `จำนวนผู้ลงทะเบียนทั้งหมด: ${activeActivity.registrations.length} คน`,
            "",
            headers.join(","),
            ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
        ].join("\n")

        const BOM = "﻿"
        const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        const dateSlug = String(activeActivity.date).slice(0, 10)
        link.download = `ผู้เข้าร่วม_${activeActivity.name.replace(/\s+/g, "_")}_${dateSlug}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const handleRequestCancel = async () => {
        if (!activeActivity) return
        if (!cancelReason.trim()) {
            alert("กรุณาระบุเหตุผลในการยกเลิก")
            return
        }
        try {
            setSubmitting(true)
            await activitiesAPI.requestCancel(activeActivity.id, cancelReason)
            alert("ยกเลิกกิจกรรมสำเร็จ")
            setIsCancelOpen(false)
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "ดำเนินการไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    const handleConfirm = async (regId: number) => {
        try {
            await registrationsAPI.confirm(regId)
            alert("ยืนยันผู้เข้าร่วมสำเร็จ")
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "ยืนยันไม่สำเร็จ")
        }
    }

    const handleCheckIn = async (regId: number) => {
        try {
            await registrationsAPI.checkIn(regId)
            alert("เช็คอินสำเร็จ")
            fetchEventDetails(id)
        } catch (err: unknown) {
            const e = err as Error
            alert(e.message || "เช็คอินไม่สำเร็จ")
        }
    }

    if (loading) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mb-4 size-12 animate-spin text-brand-600" />
                    <p className="text-lg font-medium text-fg-muted">กำลังโหลดข้อมูลงาน...</p>
                </Container>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบข้อมูลงาน"}</p>
                    <Button variant="outline" asChild>
                        <Link href="/organizer/manage">กลับไปหน้าจัดการกิจกรรม</Link>
                    </Button>
                </Container>
            </div>
        )
    }

    const unlimited = activeActivity ? isUnlimitedCapacity(activeActivity.capacity) : true
    const capacity = activeActivity?.capacity || 0
    const registered = activeActivity?.registrations?.length || 0
    const fillPercent = !unlimited && capacity > 0 ? Math.round((registered / capacity) * 100) : 0
    const seatsLeft = Math.max(capacity - registered, 0)

    return (
        <div className="bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6 flex justify-between items-center gap-4">
                    <Link href="/organizer/manage" className="inline-flex items-center text-sm text-fg-muted transition-colors hover:text-fg">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับสู่หน้าจัดการ
                    </Link>
                    <div className="flex gap-2">
                        <Link href={`/organizer/manage/${event.id}/edit`}>
                            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> แก้ไขงาน</Button>
                        </Link>
                        {activeActivity && (
                            <Button variant="destructive" size="sm" onClick={() => setIsCancelOpen(true)}>
                                ยกเลิกกิจกรรมนี้
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <div className="aspect-video w-full max-h-[280px] bg-surface-2 rounded-xl overflow-hidden relative border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveEventImageUrl(event, activeActivity)} alt={event.name} className="w-full h-full object-cover" />
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            <Badge variant={event.isPublic ? "success" : "neutral"}>{event.isPublic ? "เผยแพร่แล้ว" : "ไม่เผยแพร่"}</Badge>
                            {event.activities.length > 1 && <Badge variant="default">{event.activities.length} กิจกรรมย่อย</Badge>}
                        </div>
                    </div>
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-fg">{event.name}</h1>
                    <p className="mt-2 text-fg-muted whitespace-pre-line">{event.description}</p>
                </div>

                <Tabs value={activeActivityId ? String(activeActivityId) : undefined} onValueChange={(v) => setActiveActivityId(Number(v))}>
                    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface-2 p-1 mb-6">
                        {event.activities.map((a) => (
                            <TabsTrigger key={a.id} value={String(a.id)}>{a.name}</TabsTrigger>
                        ))}
                    </TabsList>

                    {event.activities.map((a) => (
                        <TabsContent key={a.id} value={String(a.id)}>
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <Tabs defaultValue="participants" className="w-full">
                                        <TabsList className="w-full justify-start bg-surface-2 p-1 rounded-lg mb-6">
                                            <TabsTrigger value="participants" className="flex-1">ผู้เข้าร่วม ({a.registrations?.length || 0})</TabsTrigger>
                                            <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                            <TabsTrigger value="conditions" className="flex-1">เงื่อนไข</TabsTrigger>
                                            <TabsTrigger value="benefits" className="flex-1">สิทธิประโยชน์</TabsTrigger>
                                            <TabsTrigger value="softskills" className="flex-1">Soft Skills</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="participants" className="bg-bg rounded-xl border border-border shadow-xs overflow-hidden">
                                            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
                                                <p className="text-sm text-fg-muted">ผู้ลงทะเบียนทั้งหมด <span className="font-semibold text-fg">{a.registrations?.length || 0}</span> คน</p>
                                                <Button size="sm" variant="outline" className="gap-2" onClick={exportCSV} disabled={!a.registrations?.length}>
                                                    <Download className="w-4 h-4" /> Export CSV
                                                </Button>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-surface text-fg-muted text-sm">
                                                            <th className="px-6 py-4 font-semibold">รายชื่อผู้เข้าร่วม</th>
                                                            <th className="px-6 py-4 font-semibold">สถานะ</th>
                                                            <th className="px-6 py-4 font-semibold">เช็คอิน</th>
                                                            <th className="px-6 py-4 font-semibold text-right">การจัดการ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {a.registrations && a.registrations.length > 0 ? (
                                                            (a.registrations as any[]).map((reg) => (
                                                                <tr key={reg.id} className="hover:bg-surface transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-medium text-fg">{reg.student.name}</div>
                                                                        <div className="text-xs text-fg-muted">{reg.student.studentId} | {reg.student.email}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <Badge variant={reg.status === "confirmed" ? "default" : "neutral"}>
                                                                            {reg.status === "confirmed" ? "ยืนยันแล้ว" : "รอการยืนยัน"}
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {reg.attendance === "attended" ? (
                                                                            <Badge variant="success">เข้าร่วมแล้ว</Badge>
                                                                        ) : (
                                                                            <span className="text-sm text-fg-subtle">ยังไม่เช็คอิน</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            {reg.status === "pending" && (
                                                                                <Button size="sm" variant="outline" className="text-brand-600" onClick={() => handleConfirm(reg.id)}>ยืนยัน</Button>
                                                                            )}
                                                                            {reg.status === "confirmed" && reg.attendance !== "attended" && (
                                                                                <Button size="sm" variant="outline" className="text-success" onClick={() => handleCheckIn(reg.id)}>เช็คอิน</Button>
                                                                            )}
                                                                            {reg.attendance === "attended" && (
                                                                                reg.evaluation ? (
                                                                                    <Badge variant="success" className="gap-1"><CheckSquare className="size-3" aria-hidden="true" />ประเมินอัตโนมัติแล้ว</Badge>
                                                                                ) : (
                                                                                    <Badge variant="neutral">ยังไม่มีคะแนน</Badge>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-fg-subtle">ยังไม่มีผู้ลงทะเบียน</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="details" className="bg-bg p-6 rounded-xl border border-border shadow-xs space-y-6">
                                            <div>
                                                <h3 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-brand-600" aria-hidden="true" /> เกี่ยวกับกิจกรรมนี้</h3>
                                                <p className="text-fg-muted leading-relaxed whitespace-pre-line">{a.description || "ไม่มีรายละเอียด"}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm text-fg-muted">
                                                <span><strong className="text-fg">หมวดหมู่:</strong> {categoryLabel(a.category)}</span>
                                                {a.volunteerRole && (
                                                    <span className="flex items-center gap-1"><Award className="size-4 text-brand-600" aria-hidden="true" /> <strong className="text-fg">ใบจิตอาสา:</strong> {a.volunteerRole} ({a.volunteerHours ?? "-"} ชม.)</span>
                                                )}
                                            </div>
                                            {a.tags && a.tags.length > 0 && (
                                                <div className="pt-4 border-t border-border">
                                                    <h4 className="text-sm font-semibold mb-3 text-fg">Tags</h4>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {a.tags.map((tag) => (
                                                            <Badge key={tag.tagName} variant="neutral" className="px-3 py-1"><Tag className="w-3 h-3 mr-1" aria-hidden="true" /> {tag.tagName}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {a.questions && a.questions.length > 0 && (
                                                <div className="pt-4 border-t border-border">
                                                    <h4 className="text-sm font-semibold mb-3 text-fg">คำถามเพิ่มเติมตอนลงทะเบียน</h4>
                                                    <ul className="space-y-2">
                                                        {a.questions.map((q) => (
                                                            <li key={q.id} className="text-sm text-fg-muted">
                                                                {q.label} {q.required && <span className="text-danger">*</span>}
                                                                {q.options?.length ? ` — ${q.options.map((o) => o.label).join(", ")}` : ""}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="conditions" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                            <h3 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-warning" aria-hidden="true" /> เงื่อนไขการเข้าร่วม</h3>
                                            {a.conditions && a.conditions.length > 0 ? (
                                                <ul className="space-y-3">
                                                    {a.conditions.map((item, i) => (
                                                        <li key={i} className="flex gap-3 text-fg-muted">
                                                            <div className="w-6 h-6 rounded-full bg-warning-bg text-warning flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                                            <span>{item.conditionText}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border"><p className="text-fg-muted">ไม่มีข้อมูลเงื่อนไขการเข้าร่วม</p></div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="benefits" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                            <h3 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-success" aria-hidden="true" /> สิทธิประโยชน์ที่ได้รับ</h3>
                                            {a.benefits && a.benefits.length > 0 ? (
                                                <ul className="space-y-3">
                                                    {a.benefits.map((item, i) => (
                                                        <li key={i} className="flex gap-3 text-fg-muted"><CheckCircle className="w-5 h-5 text-success shrink-0" aria-hidden="true" /><span>{item.benefitText}</span></li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border"><p className="text-fg-muted">ไม่มีข้อมูลสิทธิประโยชน์</p></div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="softskills" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                            <h3 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-brand-600" aria-hidden="true" /> Soft Skills ที่จะได้รับ</h3>
                                            {a.softSkills && a.softSkills.length > 0 ? (
                                                <div className="flex flex-wrap gap-3">
                                                    {a.softSkills.map((skill, i) => (
                                                        <div key={i} className="flex items-center gap-2 bg-brand-50 border border-border text-brand-700 px-4 py-2.5 rounded-xl font-medium">
                                                            <CheckSquare className="w-4 h-4" aria-hidden="true" />
                                                            <span>{softSkillLabel(skill.skillType)}{skill.rate !== undefined ? ` · น้ำหนัก ${skill.rate}` : ""}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border"><p className="text-fg-muted">ไม่ได้ระบุ Soft Skills สำหรับกิจกรรมนี้</p></div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                <div className="space-y-6">
                                    <Card className="border-border shadow-xs overflow-hidden">
                                        <div className="p-6 space-y-6">
                                            <h3 className="font-semibold text-lg text-fg">ข้อมูลกิจกรรมย่อย</h3>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Calendar className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">วันที่</div><div className="font-medium text-fg">{formatEventDate(a.date)}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Clock className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">เวลา</div><div className="font-medium text-fg">{a.startTime} - {a.endTime}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><MapPin className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">สถานที่</div><div className="font-medium text-fg">{a.location}</div></div>
                                                </div>
                                                <div className="pt-4 border-t border-border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-fg"><Users className="w-4 h-4" aria-hidden="true" /> ผู้เข้าร่วม</div>
                                                        <span className="text-sm text-fg-muted tabular-nums">{unlimited ? `${registered} คน (ไม่จำกัด)` : `${registered}/${capacity} คน`}</span>
                                                    </div>
                                                    {!unlimited && (
                                                        <>
                                                            <Progress value={fillPercent} className="h-2" />
                                                            <p className="text-xs text-fg-subtle mt-2 text-right">เหลืออีก {seatsLeft} ที่นั่ง</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-3 pt-2">
                                                <Button variant="outline" className="w-full" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" /> แชร์งานนี้</Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </Container>

            <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-danger flex items-center gap-2">⚠️ ยืนยันการยกเลิกกิจกรรม &quot;{activeActivity?.name}&quot;</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-warning-bg rounded-lg border border-border text-sm text-warning">
                            <strong>หมายเหตุ:</strong> กิจกรรมย่อยนี้จะถูกยกเลิกทันที ผู้เข้าร่วมที่ลงทะเบียนไว้แล้วจะได้รับผลกระทบและไม่สามารถย้อนกลับได้
                        </div>
                        <div className="space-y-2">
                            <Label>เหตุผลการยกเลิก <span className="text-danger">*</span></Label>
                            <Input placeholder="เช่น ติดภารกิจด่วน, จำนวนผู้สมัครไม่เพียงพอ..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelOpen(false)}>ยกเลิก</Button>
                        <Button variant="destructive" onClick={handleRequestCancel} disabled={submitting || !cancelReason.trim()}>
                            {submitting ? "กำลังส่งคำขอ..." : "ยืนยันการยกเลิก"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
```

- [ ] **Step 2: Manually verify**

Run: `cd frontend && npm run dev`, visit `/organizer/events/<id>` for an event with 2+ activities. Expect: Event-level header (cover image, name, description) at top, a tab per activity, switching tabs shows that activity's own participants/details/conditions/benefits/soft-skills, `Export CSV` produces the active activity's registrants only, `ยกเลิกกิจกรรมนี้` cancels only the active tab's activity (verify against `activitiesAPI.requestCancel` still working per-activity).

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/organizer/events/[id]/page.tsx"
git commit -m "feat(organizer): rebuild event detail page with per-activity tabs"
```

---

## Task 9: `/student/events` list rebuild

**Files:**
- Modify: `frontend/app/student/events/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `eventsAPI.getAllPublic` (Task 4), `resolveEventImageUrl` (Task 4), `EventSummary` (existing), `EventCard`/`EventCardBadge`/`EventCardRow`/`formatEventDate` (existing, relaxed in Task 6), `capacityLabel` (existing, `lib/api.ts`), `CATEGORIES` (existing, `lib/categories`).
- Produces: nothing consumed elsewhere — leaf page.

- [ ] **Step 1: Write the full replacement**

```tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Container } from "@/components/layout/container"
import {
    EventCard,
    EventCardBadge,
    EventCardRow,
    formatEventDate,
} from "@/components/ui/event-card"
import { eventsAPI, capacityLabel, EventSummary } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { Calendar, MapPin, Users, Loader2, Search, Layers } from "lucide-react"

function nearestUpcomingActivity(ev: EventSummary) {
    return [...ev.activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

function eventRegisteredCount(ev: EventSummary): number {
    return ev.activities.reduce((sum, a) => sum + (a.registeredCount ?? 0), 0)
}

function eventCapacity(ev: EventSummary): number | null {
    if (ev.activities.some((a) => a.capacity == null)) return null
    return ev.activities.reduce((sum, a) => sum + (a.capacity ?? 0), 0)
}

/** หน้ารายการงานฝั่งนักศึกษา — 1 การ์ดต่อ 1 งาน แม้งานนั้นจะมีหลายกิจกรรมย่อยก็ตาม */
export default function StudentEventsPage() {
    const [events, setEvents] = useState<EventSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [category, setCategory] = useState("")

    useEffect(() => {
        loadEvents()
    }, [])

    async function loadEvents() {
        try {
            setLoading(true)
            const data = await eventsAPI.getAllPublic()
            setEvents(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const filteredEvents = events.filter((ev) => {
        const matchesSearch = ev.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = !category || ev.activities.some((a) => a.category === category)
        return matchesSearch && matchesCategory
    })

    return (
        // ไม่ใส่ min-h-screen / SiteHeader / SiteFooter — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-fg mb-2">กิจกรรมทั้งหมด</h1>
                        <p className="text-fg-muted">เลือกงานที่สนใจและลงทะเบียนเข้าร่วมได้ทันที</p>
                    </div>

                    <div className="w-full md:w-auto">
                        <div className="relative md:w-80">
                            <Search className="absolute left-3 top-3.5 h-4 w-4 text-fg-subtle" />
                            <Input
                                type="text"
                                placeholder="ค้นหางาน..."
                                className="pl-10 h-12 rounded-xl shadow-sm focus-visible:ring-brand-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-10">
                    <button
                        type="button"
                        onClick={() => setCategory("")}
                        aria-pressed={category === ""}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${category === ""
                            ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/20"
                            : "border-border bg-bg text-fg-muted hover:border-border-strong hover:bg-surface"
                            }`}
                    >
                        ทั้งหมด
                    </button>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            type="button"
                            onClick={() => setCategory(cat.value)}
                            aria-pressed={category === cat.value}
                            className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${category === cat.value
                                ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/20"
                                : "border-border bg-bg text-fg-muted hover:border-border-strong hover:bg-surface"
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {!loading && (
                    <p className="mb-4 text-sm text-fg-muted">
                        พบ <span className="font-semibold text-fg">{filteredEvents.length}</span> งาน
                    </p>
                )}

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมล่าสุด...</p>
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredEvents.map((ev) => {
                            const fa = nearestUpcomingActivity(ev)
                            const capacity = eventCapacity(ev)
                            return (
                                <EventCard
                                    key={ev.id}
                                    activity={{ name: ev.name, imageUrl: ev.imageUrl ?? fa?.imageUrl }}
                                    description={ev.description}
                                    badgeLeft={
                                        ev.activities.length > 1 ? (
                                            <EventCardBadge variant="light">
                                                <Layers className="mr-1 inline size-3" aria-hidden="true" />
                                                {ev.activities.length} กิจกรรมย่อย
                                            </EventCardBadge>
                                        ) : fa?.category ? (
                                            <EventCardBadge variant="light">{fa.category}</EventCardBadge>
                                        ) : undefined
                                    }
                                    badgeRight={
                                        <EventCardBadge className={!fa || fa.status === "open" ? "bg-success/90" : "bg-fg-subtle/90"}>
                                            {!fa || fa.status === "open" ? "กำลังเปิด" : "ปิดรับสมัคร"}
                                        </EventCardBadge>
                                    }
                                    actions={
                                        <>
                                            <Link href={`/student/events/${ev.id}`} className="flex-1">
                                                <Button variant="outline" className="w-full font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                            </Link>
                                            <Link href={`/student/events/${ev.id}`} className="flex-1">
                                                <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ลงทะเบียน</Button>
                                            </Link>
                                        </>
                                    }
                                >
                                    {fa && (
                                        <EventCardRow icon={Calendar} tone="brand">
                                            {formatEventDate(fa.date)} • {fa.startTime}
                                        </EventCardRow>
                                    )}
                                    {fa && (
                                        <EventCardRow icon={MapPin} tone="danger">
                                            <span className="truncate">{fa.location}</span>
                                        </EventCardRow>
                                    )}
                                    <EventCardRow icon={Users} tone="success">
                                        {eventRegisteredCount(ev)} ผู้เข้าร่วม ({capacityLabel(capacity)})
                                    </EventCardRow>
                                </EventCard>
                            )
                        })}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-bg rounded-3xl border border-border shadow-sm mt-8">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-fg-subtle" />
                        </div>
                        <h3 className="text-xl font-bold text-fg mb-2">ไม่พบกิจกรรมที่ค้นหา</h3>
                        <p className="text-fg-muted">ลองใช้คำค้นหาอื่น เลือกหมวดหมู่อื่น หรือรองานใหม่เปิดรับสมัครเร็วๆ นี้</p>
                        <Button
                            variant="outline"
                            className="mt-6 rounded-full px-8"
                            onClick={() => { setSearchQuery(""); setCategory("") }}
                        >
                            ล้างตัวกรอง
                        </Button>
                    </div>
                )}
            </Container>
        </div>
    )
}
```

Note: `ลงทะเบียน` now links to the detail page (not `?register=true` opening the modal directly), since which sub-activity to register for is chosen on the detail page in Task 10 — this matches §4.4 of `Plan.md`.

- [ ] **Step 2: Manually verify**

Run: `cd frontend && npm run dev`, log in as the test student, visit `/student/events`. Expect: one card per Event (an Event with 2 activities shows one card with a "2 กิจกรรมย่อย" badge, not two separate cards), category filter still works (matches if any sub-activity has that category), cover image resolves correctly including the Event-cover-only case.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/student/events/page.tsx
git commit -m "feat(student): rebuild events list as one card per Event"
```

---

## Task 10: `/student/events/[id]` detail + registration modal rebuild

**Files:**
- Modify: `frontend/app/student/events/[id]/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `eventsAPI.getPublicById` (Task 4), `resolveEventImageUrl` (Task 4), `registrationsAPI.create` (existing, unchanged signature), `EventSummary`, `RegistrationAnswerBody` (existing), `useAuth` (existing, `lib/auth-context`), `softSkillLabel`/`categoryLabel` (existing).
- Produces: nothing consumed elsewhere — leaf page.

- [ ] **Step 1: Write the full replacement**

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, Tag, Info, CheckCircle, Gift, CheckSquare, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { eventsAPI, registrationsAPI, isUnlimitedCapacity, capacityLabel, EventSummary, RegistrationAnswerBody } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { useAuth } from "@/lib/auth-context"
import { softSkillLabel } from "@/lib/soft-skills"
import { categoryLabel } from "@/lib/categories"

type EventActivity = EventSummary["activities"][number]

export default function StudentEventDetailsPage() {
    const { user } = useAuth()
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const [registerForm, setRegisterForm] = useState({ name: "", studentId: "", email: "" })
    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<number, { textValue?: string; optionIds?: number[] }>>({})

    useEffect(() => {
        if (params.id) fetchEventDetails(Number(params.id))
    }, [params.id])

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await eventsAPI.getPublicById(id)
            setEvent(data)
            setActiveActivityId((prev) => prev ?? data.activities[0]?.id ?? null)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const activeActivity: EventActivity | undefined = event?.activities.find((a) => a.id === activeActivityId)

    const openRegisterDialog = useCallback(() => {
        setRegisterForm({
            name: user?.name || "",
            studentId: (user as { studentId?: string } | null)?.studentId || "",
            email: user?.email || "",
        })
        setFormError("")
        setAnswers({})
        setIsRegisterOpen(true)
    }, [user])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError("")
        if (!activeActivity) return

        const profileName = user?.name?.trim().toLowerCase() || ""
        const profileStudentId = ((user as { studentId?: string } | null)?.studentId || "").trim()
        const profileEmail = user?.email?.trim().toLowerCase() || ""

        const enteredName = registerForm.name.trim().toLowerCase()
        const enteredStudentId = registerForm.studentId.trim()
        const enteredEmail = registerForm.email.trim().toLowerCase()

        if (enteredName !== profileName) {
            setFormError("ชื่อ-นามสกุลไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }
        if (profileStudentId && enteredStudentId !== profileStudentId) {
            setFormError("รหัสนักศึกษาไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }
        if (enteredEmail !== profileEmail) {
            setFormError("อีเมลไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }

        for (const q of activeActivity.questions ?? []) {
            if (!q.required) continue
            const a = answers[q.id]
            const answered = q.type === "text" ? !!a?.textValue?.trim() : (a?.optionIds?.length ?? 0) > 0
            if (!answered) {
                setFormError(`กรุณาตอบคำถาม: ${q.label}`)
                return
            }
        }

        try {
            setSubmitting(true)
            const answerPayload: RegistrationAnswerBody[] = Object.entries(answers).map(([questionId, a]) => ({
                questionId: Number(questionId),
                textValue: a.textValue,
                optionIds: a.optionIds,
            }))
            await registrationsAPI.create(activeActivity.id, answerPayload)
            setIsRegisterOpen(false)
            alert("ลงทะเบียนสำเร็จ!")
            fetchEventDetails(event!.id)
        } catch (err: unknown) {
            const e = err as Error
            setFormError(e.message || "ลงทะเบียนไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดงาน...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
                <div className="bg-bg p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-border">
                    <AlertTriangle className="mx-auto mb-4 size-12 text-danger" aria-hidden="true" />
                    <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบงาน</h2>
                    <p className="text-fg-muted mb-6">{error || "งานนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                    <Button onClick={() => router.push("/student/events")} className="w-full">กลับไปหน้าค้นหากิจกรรม</Button>
                </div>
            </div>
        )
    }

    const unlimited = activeActivity ? isUnlimitedCapacity(activeActivity.capacity) : true
    const registeredCount = activeActivity?.registeredCount ?? 0

    return (
        <div className="min-h-screen bg-surface pb-12">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/student/events" className="inline-flex items-center text-fg-muted hover:text-fg transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับ
                    </Link>
                </div>

                <div className="mb-6">
                    <div className="aspect-video w-full max-h-[320px] bg-surface-2 rounded-xl overflow-hidden relative border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveEventImageUrl(event, activeActivity)} alt={event.name} className="w-full h-full object-cover" />
                        {event.activities.length > 1 && (
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-brand-600">{event.activities.length} กิจกรรมย่อย</Badge>
                            </div>
                        )}
                    </div>
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-fg">{event.name}</h1>
                    <p className="mt-2 text-fg-muted whitespace-pre-line">{event.description}</p>
                </div>

                <Tabs value={activeActivityId ? String(activeActivityId) : undefined} onValueChange={(v) => setActiveActivityId(Number(v))}>
                    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface-2 p-1 mb-6">
                        {event.activities.map((a) => (
                            <TabsTrigger key={a.id} value={String(a.id)}>{a.name}</TabsTrigger>
                        ))}
                    </TabsList>

                    {event.activities.map((a) => (
                        <TabsContent key={a.id} value={String(a.id)}>
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-8">
                                    <Tabs defaultValue="details" className="w-full">
                                        <TabsList className="w-full justify-start bg-surface-2 p-1 rounded-lg mb-6">
                                            <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                            <TabsTrigger value="conditions" className="flex-1">เงื่อนไข</TabsTrigger>
                                            <TabsTrigger value="benefits" className="flex-1">สิทธิประโยชน์</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="details" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-fg"><Info className="w-5 h-5 text-brand-600" aria-hidden="true" /> เกี่ยวกับกิจกรรมนี้</h3>
                                            <p className="text-fg-muted leading-relaxed whitespace-pre-line">{a.description}</p>
                                            <p className="mt-4 text-sm text-fg-muted"><strong className="text-fg">หมวดหมู่:</strong> {categoryLabel(a.category)}</p>

                                            {a.tags && a.tags.length > 0 && (
                                                <div className="mt-8 pt-6 border-t border-border">
                                                    <h4 className="text-sm font-semibold mb-3 text-fg">Tags</h4>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {a.tags.map((tag) => (
                                                            <Badge key={tag.tagName} variant="neutral" className="px-3 py-1"><Tag className="w-3 h-3 mr-1" aria-hidden="true" /> {tag.tagName}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-8 pt-6 border-t border-border">
                                                <h4 className="text-sm font-semibold mb-3 text-fg">Soft Skills ที่จะได้รับ</h4>
                                                <div className="flex gap-2 flex-wrap">
                                                    {a.softSkills && a.softSkills.length > 0 ? a.softSkills.map((skill, idx) => (
                                                        <Badge key={idx} variant="outline" className="px-3 py-1 bg-brand-50 text-brand-700 border-border">
                                                            <CheckSquare className="w-3 h-3 mr-1" aria-hidden="true" /> {softSkillLabel(skill.skillType)}
                                                        </Badge>
                                                    )) : <span className="text-sm text-fg-muted">ไม่ได้ระบุ Soft Skills</span>}
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="conditions" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-fg"><CheckCircle className="w-5 h-5 text-warning" aria-hidden="true" /> เงื่อนไขการเข้าร่วม</h3>
                                            {a.conditions && a.conditions.length > 0 ? (
                                                <ul className="space-y-3">
                                                    {a.conditions.map((item, i) => (
                                                        <li key={i} className="flex gap-3 text-fg-muted">
                                                            <div className="w-6 h-6 rounded-full bg-warning-bg text-warning flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                                            <span>{item.conditionText}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border"><p className="text-fg-muted">ไม่มีข้อมูลเงื่อนไขการเข้าร่วม</p></div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="benefits" className="bg-bg p-6 rounded-xl border border-border shadow-xs">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-fg"><Gift className="w-5 h-5 text-success" aria-hidden="true" /> สิทธิประโยชน์</h3>
                                            {a.benefits && a.benefits.length > 0 ? (
                                                <ul className="space-y-3">
                                                    {a.benefits.map((item, i) => (
                                                        <li key={i} className="flex gap-3 text-fg-muted"><CheckCircle className="w-5 h-5 text-success shrink-0" aria-hidden="true" /><span>{item.benefitText}</span></li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="py-8 text-center bg-surface rounded-lg border border-dashed border-border"><p className="text-fg-muted">ไม่มีข้อมูลสิทธิประโยชน์ระบุไว้</p></div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                <div className="space-y-6">
                                    <Card className="border-border shadow-xs overflow-hidden">
                                        <div className="p-6 space-y-6">
                                            <h3 className="font-semibold text-lg text-fg">ข้อมูลกิจกรรมย่อย</h3>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Calendar className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">วันที่</div><div className="font-medium text-fg">{formatEventDate(a.date)}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Clock className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">เวลา</div><div className="font-medium text-fg">{a.startTime} - {a.endTime}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><MapPin className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">สถานที่</div><div className="font-medium text-fg">{a.location}</div></div>
                                                </div>
                                                <div className="pt-4 border-t border-border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-fg"><Users className="w-4 h-4" aria-hidden="true" /> ผู้เข้าร่วม</div>
                                                        <span className="text-sm text-fg-muted">{registeredCount} {capacityLabel(a.capacity) !== "ไม่จำกัดจำนวน" ? `/${a.capacity} คน` : "คน (ไม่จำกัด)"}</span>
                                                    </div>
                                                    {!unlimited && a.capacity && (
                                                        <>
                                                            <Progress value={registeredCount} max={a.capacity} className="h-2" />
                                                            <p className="text-xs text-fg-subtle mt-2 text-right">เหลืออีก {Math.max(a.capacity - registeredCount, 0)} ที่นั่ง</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-3 pt-2">
                                                <Button className="w-full h-11 text-base font-semibold" onClick={openRegisterDialog}>ลงทะเบียนเข้าร่วม</Button>
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`)
                                                        alert("คัดลอกลิงก์สำหรับแชร์เรียบร้อยแล้ว!")
                                                    }}
                                                >
                                                    <Share2 className="w-4 h-4 mr-2" /> แชร์งานนี้
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วม &quot;{activeActivity?.name}&quot;</DialogTitle>
                        <p className="text-fg-muted text-sm">กรุณายืนยันข้อมูลของคุณเพื่อยืนยันตัวตนก่อนลงทะเบียน</p>
                    </DialogHeader>

                    <form onSubmit={handleRegister} className="space-y-4 py-2">
                        {formError && (
                            <div className="bg-danger-bg border border-danger text-danger text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="reg-name">ชื่อ-นามสกุล <span className="text-danger">*</span></Label>
                            <Input id="reg-name" value={registerForm.name} onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="กรอกชื่อ-นามสกุล" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reg-studentId">รหัสนักศึกษา <span className="text-danger">*</span></Label>
                            <Input id="reg-studentId" value={registerForm.studentId} onChange={(e) => setRegisterForm((prev) => ({ ...prev, studentId: e.target.value }))} placeholder="กรอกรหัสนักศึกษา" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reg-email">อีเมล <span className="text-danger">*</span></Label>
                            <Input id="reg-email" type="email" value={registerForm.email} onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="กรอกอีเมล" required />
                        </div>

                        {activeActivity?.questions && activeActivity.questions.length > 0 && (
                            <div className="space-y-4 border-t border-border pt-4">
                                <p className="text-sm font-medium text-fg">คำถามเพิ่มเติม</p>
                                {activeActivity.questions.map((q) => (
                                    <div key={q.id} className="space-y-2">
                                        <Label>{q.label} {q.required && <span className="text-danger">*</span>}</Label>
                                        {q.type === "text" && (
                                            <Input
                                                value={answers[q.id]?.textValue || ""}
                                                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { textValue: e.target.value } }))}
                                            />
                                        )}
                                        {q.type === "single_choice" && (
                                            <div className="space-y-1.5">
                                                {q.options.map((opt) => (
                                                    <label key={opt.id} className="flex items-center gap-2 text-sm text-fg-muted">
                                                        <input
                                                            type="radio"
                                                            name={`question-${q.id}`}
                                                            checked={(answers[q.id]?.optionIds ?? [])[0] === opt.id}
                                                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: { optionIds: [opt.id] } }))}
                                                        />
                                                        {opt.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === "multi_choice" && (
                                            <div className="space-y-1.5">
                                                {q.options.map((opt) => {
                                                    const selected = answers[q.id]?.optionIds ?? []
                                                    const checked = selected.includes(opt.id)
                                                    return (
                                                        <label key={opt.id} className="flex items-center gap-2 text-sm text-fg-muted">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    const next = e.target.checked ? [...selected, opt.id] : selected.filter((id) => id !== opt.id)
                                                                    setAnswers((prev) => ({ ...prev, [q.id]: { optionIds: next } }))
                                                                }}
                                                            />
                                                            {opt.label}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-fg-subtle bg-surface px-3 py-2 rounded-lg">* ข้อมูลจะถูกตรวจสอบกับบัญชีผู้ใช้ที่ลงทะเบียนไว้ หากไม่ตรงกันจะไม่สามารถลงทะเบียนได้</p>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} disabled={submitting}>ยกเลิก</Button>
                            <Button type="submit" disabled={submitting}>{submitting ? "กำลังลงทะเบียน..." : "ยืนยันการลงทะเบียน"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
```

- [ ] **Step 2: Manually verify**

Run: `cd frontend && npm run dev`, log in as the test student, click into an Event with 2 activities from `/student/events`. Expect: tab per activity, switching tabs updates the info panel and progress bar, `ลงทะเบียนเข้าร่วม` opens the modal titled with the *active tab's* activity name, submitting registers for that specific activity (verify via the organizer detail page's participant tab for that activity, not the other one), the modal has no raw `bg-red-50`/`bg-blue-600`/`text-gray-500` colors left (grep the file to confirm), required custom questions still block submission with the same error banner styling as the create-wizard's `FormField` pattern.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/student/events/[id]/page.tsx"
git commit -m "feat(student): rebuild event detail page with per-activity tabs and tokenized registration modal"
```

---

## Task 11: Full-branch verification pass

**Files:** none (verification only)

- [ ] **Step 1: Backend test suite**

Run: `cd backend && npm run test`
Expected: all specs pass, including the new `events.repository.spec.ts` and `events.service.spec.ts`.

- [ ] **Step 2: Backend build**

Run: `cd backend && npm run build`
Expected: exits 0 (this also re-runs `prisma generate`, catching any schema/type drift).

- [ ] **Step 3: Frontend lint**

Run: `cd frontend && npm run lint`
Expected: exits 0, no new warnings/errors in any file touched by this plan.

- [ ] **Step 4: End-to-end manual walkthrough**

With both servers running, as the test organizer: create a fresh 2-activity event via `/organizer/create` (cover image on step 1 only, leave one activity's own image blank — this is the exact bug scenario), then verify in order: it shows correctly on `/organizer/manage` with the cover image visible, `/organizer/manage/[id]/edit` opens pre-filled and a save round-trips correctly, `/organizer/events/[id]` shows both activities' full data across tabs. Then as the test student: verify `/student/events` shows one card for it with the cover image, `/student/events/[id]` shows both tabs, register for one activity, confirm on the organizer side that only that activity's participant count increased.

- [ ] **Step 5: Report**

Summarize pass/fail for each of the above in the SDD ledger; do not commit (verification-only task).

---

## Self-Review Notes

- **Spec coverage:** §3.1 (Task 1-2), §3.2 (Task 3), §3.3 (Task 4), §4.1 (Task 6), §4.2 (Task 7), §4.3 (Task 8), §4.4 (Task 9), §4.5 (Task 10), §6 error handling (woven into Tasks 2, 7, 10), §7 testing approach (Tasks 1-2 backend tests, Task 11 manual pass) — all covered.
- **Route collision check:** confirmed `GET /api/events` (root) and `GET /api/events/:id/public` don't collide with the existing organizer routes `GET /api/events/my`, `GET /api/events/:id`, `GET /api/events/:id/survey-results` (Task 3, Step 4 note).
- **Type consistency:** `EventCardProps.activity` (Task 6) is consumed identically in Tasks 6, 9 with `{ name, imageUrl }` object literals; `resolveEventImageUrl` (Task 4) signature matches its call sites in Tasks 6, 8, 9, 10.
