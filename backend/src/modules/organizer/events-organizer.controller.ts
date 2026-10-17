import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { memoryStorage } from "multer";
import {
  assertRealFileType,
  DOCUMENT_UPLOAD,
  makeFileFilter,
} from "../../common/utils";
import { StorageService } from "../shared/storage/storage.service";
import { EventsService } from "../shared/events/events.service";
import { EventDraftService } from "../shared/events/event-draft.service";
import { CreateEventDto } from "../shared/events/dto/create-event.dto";
import { UpdateEventDto } from "../shared/events/dto/update-event.dto";
import { SetEventPublicDto } from "../shared/events/dto/set-event-public.dto";
import { SetActivityStatusDto } from "../shared/activities/dto/set-activity-status.dto";
import { SaveEventDraftDto } from "../shared/events/dto/save-event-draft.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums/role.enum";

@ApiTags("Events")
@Controller("api/events")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@ApiBearerAuth()
export class EventsOrganizerController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventDraftService: EventDraftService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * GET /api/events/my - ดูงานที่ฉันสร้าง (Organizer)
   */
  @Get("my")
  @ApiOperation({ summary: "ดูงานที่ฉันสร้าง (Organizer)" })
  async findMyEvents(@CurrentUser("id") userId: number) {
    return this.eventsService.findByOrganizer(userId);
  }

  // เส้นทางฉบับร่างทั้ง 3 ต้องอยู่ก่อน ":id" เสมอ — ไม่งั้น Nest จะจับ "draft" เป็นค่า publicId แทน แล้ว resolveId หาไม่เจอ (404)

  /**
   * GET /api/events/draft - ดูฉบับร่างงานที่บันทึกไว้ล่าสุดของฉัน (Organizer) — ไม่มี = null
   */
  @Get("draft")
  @ApiOperation({
    summary: "ดูฉบับร่างงานที่บันทึกไว้ล่าสุดของฉัน (Organizer)",
  })
  async getDraft(@CurrentUser("id") userId: number) {
    return this.eventDraftService.getDraft(userId);
  }

  /**
   * PUT /api/events/draft - บันทึก/ทับฉบับร่างงาน (Organizer) — มีได้ทีละ 1 ฉบับต่อผู้จัด
   */
  @Put("draft")
  @ApiOperation({ summary: "บันทึก/ทับฉบับร่างงาน (Organizer)" })
  async saveDraft(
    @CurrentUser("id") userId: number,
    @Body() dto: SaveEventDraftDto,
  ) {
    return this.eventDraftService.saveDraft(userId, dto.payload);
  }

  /**
   * DELETE /api/events/draft - ลบฉบับร่างงานของฉัน (Organizer)
   */
  @Delete("draft")
  @ApiOperation({ summary: "ลบฉบับร่างงานของฉัน (Organizer)" })
  async clearDraft(@CurrentUser("id") userId: number) {
    await this.eventDraftService.clearDraft(userId);
  }

  /**
   * GET /api/events/:id - ดูรายละเอียดงาน (เจ้าของ / Admin)
   */
  @Get(":id")
  @ApiOperation({ summary: "ดูรายละเอียดงาน (เจ้าของ / Admin)" })
  async findById(
    @Param("id") id: string,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
  ) {
    return this.eventsService.findByIdForOrganizer(id, userId, userRole);
  }

  /**
   * GET /api/events/:id/survey-results - ดูผลสรุปแบบสำรวจของงาน (เจ้าของ / Admin)
   */
  @Get(":id/survey-results")
  @ApiOperation({ summary: "ดูผลสรุปแบบสำรวจของงาน (เจ้าของ / Admin)" })
  async getSurveyResults(
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
    @Param("id") id: string,
  ) {
    return this.eventsService.getSurveyResults(id, userId, userRole);
  }

  /**
   * PATCH /api/events/:id - แก้ไขงาน (เจ้าของ / Admin)
   */
  @Patch(":id")
  @ApiOperation({ summary: "แก้ไขงาน (เจ้าของ / Admin)" })
  async update(
    @Param("id") id: string,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
    @Body() updateDto: UpdateEventDto,
  ) {
    return this.eventsService.update(userId, userRole, id, updateDto);
  }

  /**
   * PATCH /api/events/:id/publish - สลับสถานะเผยแพร่ของงาน (เจ้าของ / Admin)
   */
  @Patch(":id/publish")
  @ApiOperation({ summary: "สลับสถานะเผยแพร่ของงาน (เจ้าของ / Admin)" })
  async setPublic(
    @Param("id") id: string,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
    @Body() dto: SetEventPublicDto,
  ) {
    return this.eventsService.setPublic(userId, userRole, id, dto.isPublic);
  }

  /**
   * PATCH /api/events/:id/activities-status - เปิด/ปิดรับสมัครกิจกรรมย่อยทั้งหมดในงานนี้ชั่วคราว (เจ้าของ / Admin)
   */
  @Patch(":id/activities-status")
  @ApiOperation({
    summary:
      "เปิด/ปิดรับสมัครกิจกรรมย่อยทั้งหมดในงานนี้ชั่วคราว (เจ้าของ / Admin)",
  })
  async setActivitiesStatus(
    @Param("id") id: string,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
    @Body() dto: SetActivityStatusDto,
  ) {
    return this.eventsService.setActivitiesStatus(
      userId,
      userRole,
      id,
      dto.status,
    );
  }

  /**
   * POST /api/events/:id/duplicate - คัดลอกงานทั้งงานพร้อมกิจกรรมย่อยเป็นงานใหม่ (เจ้าของ / Admin)
   */
  @Post(":id/duplicate")
  @ApiOperation({
    summary: "คัดลอกงานทั้งงานพร้อมกิจกรรมย่อยเป็นงานใหม่ (เจ้าของ / Admin)",
  })
  async duplicate(
    @Param("id") id: string,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
  ) {
    return this.eventsService.duplicate(userId, userRole, id);
  }

  /**
   * DELETE /api/events/:id - ลบงานทั้งงานพร้อมกิจกรรมย่อย (เจ้าของ / Admin)
   */
  @Delete(":id")
  @ApiOperation({ summary: "ลบงานทั้งงานพร้อมกิจกรรมย่อย (เจ้าของ / Admin)" })
  async remove(
    @Param("id") id: string,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
  ) {
    await this.eventsService.delete(userId, userRole, id);
  }

  /**
   * POST /api/events - สร้างงานใหม่พร้อมกิจกรรมย่อย (Organizer / Admin)
   */
  @Post()
  @ApiOperation({ summary: "สร้างงานใหม่พร้อมกิจกรรมย่อย (Organizer / Admin)" })
  async create(
    @CurrentUser("id") userId: number,
    @Body() createDto: CreateEventDto,
  ) {
    return this.eventsService.create(userId, createDto);
  }

  /**
   * POST /api/events/upload-attachment - อัปโหลดไฟล์แนบของกิจกรรม
   */
  @Post("upload-attachment")
  @ApiOperation({ summary: "อัปโหลดไฟล์แนบของกิจกรรม (Organizer / Admin)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: makeFileFilter(DOCUMENT_UPLOAD),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        "ไม่พบไฟล์ที่อัปโหลด หรือชนิดไฟล์ไม่ถูกต้อง",
      );
    }

    assertRealFileType(DOCUMENT_UPLOAD, file.buffer);

    // ไฟล์แนบต้องบังคับดาวน์โหลดเสมอ ไม่ใช่เปิดในเบราว์เซอร์ (เดิมตั้งที่ ServeStaticModule
    // ตาม path /uploads/attachments/* — ย้ายมาตั้งเป็น object metadata ตอนอัปโหลดแทน เพราะ R2
    // ไม่ได้ผ่าน ServeStaticModule ของเราอีกต่อไป)
    const saved = await this.storageService.save(
      file.buffer,
      DOCUMENT_UPLOAD,
      file.mimetype,
      "attachments",
      "attachment",
    );

    return {
      message: "อัปโหลดไฟล์แนบสำเร็จ",
      attachmentUrl: saved.url,
    };
  }
}
