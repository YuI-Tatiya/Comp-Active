import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
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
import { diskStorage } from "multer";
import {
  assertRealFileType,
  DOCUMENT_UPLOAD,
  makeFileFilter,
  safeExtensionFor,
} from "../../common/utils";
import { join } from "path";
import * as crypto from "crypto";
import { EventsService } from "../shared/events/events.service";
import { CreateEventDto } from "../shared/events/dto/create-event.dto";
import { UpdateEventDto } from "../shared/events/dto/update-event.dto";
import { SetEventPublicDto } from "../shared/events/dto/set-event-public.dto";
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
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/events/my - ดูงานที่ฉันสร้าง (Organizer)
   */
  @Get("my")
  @ApiOperation({ summary: "ดูงานที่ฉันสร้าง (Organizer)" })
  async findMyEvents(@CurrentUser("id") userId: number) {
    return this.eventsService.findByOrganizer(userId);
  }

  /**
   * GET /api/events/:id - ดูรายละเอียดงาน (เจ้าของ / Admin)
   */
  @Get(":id")
  @ApiOperation({ summary: "ดูรายละเอียดงาน (เจ้าของ / Admin)" })
  async findById(
    @Param("id", ParseIntPipe) id: number,
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
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.eventsService.getSurveyResults(id, userId, userRole);
  }

  /**
   * PATCH /api/events/:id - แก้ไขงาน (เจ้าของ / Admin)
   */
  @Patch(":id")
  @ApiOperation({ summary: "แก้ไขงาน (เจ้าของ / Admin)" })
  async update(
    @Param("id", ParseIntPipe) id: number,
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
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
    @Body() dto: SetEventPublicDto,
  ) {
    return this.eventsService.setPublic(userId, userRole, id, dto.isPublic);
  }

  /**
   * DELETE /api/events/:id - ลบงานทั้งงานพร้อมกิจกรรมย่อย (เจ้าของ / Admin)
   */
  @Delete(":id")
  @ApiOperation({ summary: "ลบงานทั้งงานพร้อมกิจกรรมย่อย (เจ้าของ / Admin)" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
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
      storage: diskStorage({
        destination: "./public/uploads/attachments",
        filename: (req, file, cb) => {
          const ext = safeExtensionFor(DOCUMENT_UPLOAD, file.mimetype);
          if (!ext) return cb(new Error("ชนิดไฟล์ไม่รองรับ"), "");
          cb(null, `${crypto.randomUUID()}${ext}`);
        },
      }),
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

    assertRealFileType(
      DOCUMENT_UPLOAD,
      join(process.cwd(), "public", "uploads", "attachments", file.filename),
    );

    return {
      message: "อัปโหลดไฟล์แนบสำเร็จ",
      attachmentUrl: `/uploads/attachments/${file.filename}`,
    };
  }
}
