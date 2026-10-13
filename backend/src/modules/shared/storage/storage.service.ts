import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import * as crypto from "crypto";
import {
  safeExtensionFor,
  type UploadKind,
} from "../../../common/utils/upload.util";

export interface SavedFile {
  /** URL เต็มพร้อมใช้แสดงผล — R2: โดเมนสาธารณะของ bucket, ดิสก์: path สัมพัทธ์ /uploads/... */
  url: string;
}

/**
 * ที่เก็บไฟล์ที่ผู้ใช้อัปโหลด — R2 เมื่อตั้งค่าไว้ (ดู storage.config.ts), ไม่งั้นเขียนลงดิสก์เหมือนเดิม
 *
 * ของเดิม multer เขียนไฟล์ลงดิสก์ตรง ๆ ผ่าน diskStorage แล้วเปิดกลับมาอ่าน magic bytes จากไฟล์จริง
 * พอย้ายไป R2 ไม่มี "ดิสก์ถาวร" ให้เขียนแล้วอ่านกลับแบบนั้น (Railway ของเดิมก็ไม่รับประกัน
 * disk เดิมข้ามการ deploy) จึงรับ buffer จาก memoryStorage ของ multer เข้ามาตรง ๆ แทน
 * ตรวจ magic bytes จาก buffer ก่อนเขียน/อัปโหลดเสมอ (ดู assertRealFileType ใน upload.util.ts)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket?: string;
  private readonly publicUrl?: string;

  constructor(private readonly config: ConfigService) {
    const configured = this.config.get<boolean>("storage.configured");
    if (configured) {
      this.bucket = this.config.get<string>("storage.bucket");
      this.publicUrl = this.config.get<string>("storage.publicUrl");
      this.client = new S3Client({
        region: "auto",
        endpoint: this.config.get<string>("storage.endpoint"),
        credentials: {
          accessKeyId: this.config.get<string>("storage.accessKeyId")!,
          secretAccessKey: this.config.get<string>("storage.secretAccessKey")!,
        },
      });
      this.logger.log(
        `ใช้ Cloudflare R2 เป็นที่เก็บไฟล์อัปโหลด (bucket: ${this.bucket})`,
      );
    } else {
      this.client = null;
      this.logger.warn(
        "ไม่ได้ตั้งค่า R2 (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/...) — ไฟล์อัปโหลดจะถูกเขียนลงดิสก์ที่ backend/public/uploads แทน " +
          "(ใช้ได้เฉพาะตอน dev/เครื่องที่มีดิสก์ถาวร ไม่ใช่สภาพแวดล้อมแบบ ephemeral filesystem)",
      );
    }
  }

  get usingR2(): boolean {
    return this.client !== null;
  }

  /**
   * บันทึกไฟล์ที่อัปโหลด (ตรวจ magic bytes แล้วเท่านั้น — เรียก assertRealFileType ก่อนเสมอ)
   * @param folder โฟลเดอร์ย่อยใต้ uploads/ เช่น "activities" หรือ "attachments"
   * @param contentDisposition ตั้งเฉพาะไฟล์ที่ต้องบังคับดาวน์โหลดแทนการเปิดในเบราว์เซอร์ (เช่นไฟล์แนบ)
   */
  async save(
    buffer: Buffer,
    kind: UploadKind,
    mimetype: string,
    folder: string,
    contentDisposition?: string,
  ): Promise<SavedFile> {
    const ext = safeExtensionFor(kind, mimetype);
    if (!ext) throw new Error("ชนิดไฟล์ไม่รองรับ");
    const filename = `${crypto.randomUUID()}${ext}`;
    const key = `${folder}/${filename}`;

    if (this.client) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          ...(contentDisposition
            ? { ContentDisposition: contentDisposition }
            : {}),
        }),
      );
      return { url: `${this.publicUrl}/${key}` };
    }

    const diskPath = join(process.cwd(), "public", "uploads", folder, filename);
    mkdirSync(dirname(diskPath), { recursive: true });
    writeFileSync(diskPath, buffer);
    return { url: `/uploads/${key}` };
  }
}
