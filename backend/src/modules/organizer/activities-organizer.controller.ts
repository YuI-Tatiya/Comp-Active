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
import { join } from "path";
import * as crypto from "crypto";
import {
  assertRealFileType,
  IMAGE_UPLOAD,
  makeFileFilter,
  safeExtensionFor,
} from "../../common/utils";
import { ActivitiesService } from "../shared/activities/activities.service";
import { CreateActivityDto } from "../shared/activities/dto/create-activity.dto";
import { UpdateActivityDto } from "../shared/activities/dto/update-activity.dto";
import { SetActivityStatusDto } from "../shared/activities/dto/set-activity-status.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums/role.enum";

@ApiTags("Activities")
@Controller("api/activities")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@ApiBearerAuth()
export class ActivitiesOrganizerController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * GET /api/activities/my - ดูกิจกรรมที่ฉันสร้าง (Organizer)
   */
  @Get("my")
  @ApiOperation({ summary: "ดูกิจกรรมที่ฉันสร้าง (Organizer)" })
  async findMyActivities(@CurrentUser("id") userId: number) {
    return this.activitiesService.findByOrganizer(userId);
  }

  @Get("stats/organizer")
  @ApiOperation({ summary: "ดูสถิติของผู้จัดงาน (Organizer)" })
  async getOrganizerStats(@CurrentUser("id") userId: number) {
    return this.activitiesService.getOrganizerStats(userId);
  }

  /**
   * GET /api/activities/my/:id - ดูรายละเอียดกิจกรรมเดี่ยวแบบเต็ม รวมรายชื่อผู้ลงทะเบียน (เจ้าของ / Admin)
   * แยกจาก GET /api/activities/:id (public) ที่ไม่ส่งรายชื่อ/ข้อมูลติดต่อผู้ลงทะเบียนออกไป
   */
  @Get("my/:id")
  @ApiOperation({
    summary:
      "ดูรายละเอียดกิจกรรมเดี่ยวแบบเต็ม รวมรายชื่อผู้ลงทะเบียน (เจ้าของ / Admin)",
  })
  async findMyActivityById(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
  ) {
    return this.activitiesService.findByIdForOrganizer(id, userId, userRole);
  }

  /**
   * GET /api/activities/:id/survey-results - ดูผลสรุปแบบสำรวจของกิจกรรมเดี่ยว (เจ้าของ / Admin)
   */
  @Get(":id/survey-results")
  @ApiOperation({
    summary: "ดูผลสรุปแบบสำรวจของกิจกรรมเดี่ยว (เจ้าของ / Admin)",
  })
  async getSurveyResults(
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.activitiesService.getSurveyResults(id, userId, userRole);
  }

  /**
   * POST /api/activities - สร้างกิจกรรมใหม่ (Organizer)
   */
  @Post()
  @ApiOperation({ summary: "สร้างกิจกรรมใหม่ (Organizer / Admin)" })
  async create(
    @CurrentUser("id") userId: number,
    @Body() createDto: CreateActivityDto,
  ) {
    return this.activitiesService.create(userId, createDto);
  }

  /**
   * PATCH /api/activities/:id - แก้ไขกิจกรรม (Organizer owner / Admin)
   */
  @Patch(":id")
  @ApiOperation({ summary: "แก้ไขกิจกรรม (เจ้าของ / Admin)" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
    @Body() updateDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, userId, userRole, updateDto);
  }

  /**
   * POST /api/activities/:id/duplicate - คัดลอกกิจกรรมเดี่ยวทั้งใบเป็นกิจกรรมใหม่ (เจ้าของ / Admin)
   */
  @Post(":id/duplicate")
  @ApiOperation({ summary: "คัดลอกกิจกรรมเดี่ยวทั้งใบเป็นกิจกรรมใหม่ (เจ้าของ / Admin)" })
  async duplicate(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
  ) {
    return this.activitiesService.duplicate(id, userId, userRole);
  }

  /**
   * PATCH /api/activities/:id/status - เปิด/ปิดรับสมัครกิจกรรมชั่วคราว (เจ้าของ / Admin)
   */
  @Patch(":id/status")
  @ApiOperation({ summary: "เปิด/ปิดรับสมัครกิจกรรมชั่วคราว (เจ้าของ / Admin)" })
  async setStatus(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
    @Body() dto: SetActivityStatusDto,
  ) {
    return this.activitiesService.setStatus(id, userId, userRole, dto.status);
  }

  /**
   * POST /api/activities/upload-image - อัปโหลดรูปภาพกิจกรรม
   */
  @Post("upload-image")
  @ApiOperation({ summary: "อัปโหลดรูปภาพกิจกรรม (Organizer / Admin)" })
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
        destination: "./public/uploads/activities",
        filename: (req, file, cb) => {
          // นามสกุลมาจาก mimetype ที่ผ่าน allowlist ไม่ใช่จากชื่อไฟล์ที่ผู้ใช้ส่งมา
          const ext = safeExtensionFor(IMAGE_UPLOAD, file.mimetype);
          if (!ext) return cb(new Error("ชนิดไฟล์ไม่รองรับ"), "");
          cb(null, `${crypto.randomUUID()}${ext}`);
        },
      }),
      fileFilter: makeFileFilter(IMAGE_UPLOAD),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        "ไม่พบไฟล์ที่อัปโหลด หรือชนิดไฟล์ไม่ถูกต้อง",
      );
    }

    // ด่านสุดท้าย: อ่าน magic bytes จากไฟล์จริงบนดิสก์ ปลอมด้วย header ไม่ได้
    assertRealFileType(
      IMAGE_UPLOAD,
      join(process.cwd(), "public", "uploads", "activities", file.filename),
    );

    return {
      message: "อัปโหลดรูปภาพสำเร็จ",
      imageUrl: `/uploads/activities/${file.filename}`,
    };
  }

  /**
   * DELETE /api/activities/:id - ลบกิจกรรม
   */
  @Delete(":id")
  @ApiOperation({ summary: "ลบกิจกรรม (เจ้าของ / Admin)" })
  async delete(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
  ) {
    await this.activitiesService.delete(id, userId, userRole);
    return { message: "ลบกิจกรรมสำเร็จ" };
  }

  /**
   * PATCH /api/activities/:id/complete - จบกิจกรรม (เจ้าของ / Admin)
   */
  @Patch(":id/complete")
  @ApiOperation({
    summary: "จบกิจกรรม — ปิดรับสมัครและปลดล็อกแบบสำรวจ (เจ้าของ / Admin)",
  })
  async markCompleted(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @CurrentUser("role") userRole: UserRole,
  ) {
    return this.activitiesService.markCompleted(id, userId, userRole);
  }

  /**
   * POST /api/activities/:id/request-cancel - ร้องขอการยกเลิกกิจกรรม (Organizer)
   */
  @Post(":id/request-cancel")
  @ApiOperation({ summary: "ร้องขอการยกเลิกกิจกรรม (Organizer)" })
  async requestCancellation(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser("id") userId: number,
    @Body("reason") reason: string,
  ) {
    return this.activitiesService.requestCancellation(id, userId, reason);
  }
}
