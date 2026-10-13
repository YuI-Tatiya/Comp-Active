import { BadRequestException } from "@nestjs/common";

/**
 * A05 Injection / A02 Security Misconfiguration — ตรวจไฟล์อัปโหลดให้ลึกกว่าชื่อไฟล์
 *
 * ของเดิมกรองด้วย `file.originalname.match(/\.(jpg|png|...)$/i)` อย่างเดียว
 * ซึ่งเชื่อ "ชื่อไฟล์ที่ client ส่งมา" ล้วน ๆ — ใน Burp Suite แค่แก้ filename ใน
 * multipart ให้ลงท้าย .png ก็อัปไฟล์อะไรก็ได้เข้ามาเก็บไว้บนเซิร์ฟเวอร์
 * แล้วไฟล์เหล่านั้นถูกเสิร์ฟกลับออกไปจากโดเมน api ผ่าน ServeStaticModule
 *
 * ที่นี่ตรวจสามชั้น: นามสกุล → mimetype ที่ประกาศมา → magic bytes ของไฟล์จริง
 */

export interface UploadKind {
  /** mimetype ที่ยอมรับ → นามสกุลที่อนุญาตให้เก็บ */
  readonly allow: Readonly<Record<string, readonly string[]>>;
  /** ลายเซ็นไบต์ต้นไฟล์ที่ยอมรับ */
  readonly signatures: readonly (readonly number[])[];
  readonly label: string;
}

export const IMAGE_UPLOAD: UploadKind = {
  label: "รูปภาพ (jpg, png, gif)",
  allow: {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
  },
  signatures: [
    [0xff, 0xd8, 0xff], // JPEG
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
    [0x47, 0x49, 0x46, 0x38], // GIF8
  ],
};

export const DOCUMENT_UPLOAD: UploadKind = {
  label: "เอกสาร (pdf, doc, docx, ppt, pptx, xls, xlsx, zip)",
  allow: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      [".pptx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "application/zip": [".zip"],
    "application/x-zip-compressed": [".zip"],
  },
  signatures: [
    [0x25, 0x50, 0x44, 0x46], // %PDF
    [0x50, 0x4b, 0x03, 0x04], // PK.. (zip / docx / xlsx / pptx)
    [0x50, 0x4b, 0x05, 0x06], // zip เปล่า
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE2 (doc / xls / ppt แบบเก่า)
  ],
};

/**
 * นามสกุลที่จะเก็บลงดิสก์ "สร้างจาก mimetype ที่ผ่าน allowlist" ไม่ใช่จากชื่อไฟล์เดิม
 * ทำให้ผู้อัปโหลดกำหนดนามสกุลบนเซิร์ฟเวอร์เองไม่ได้เลย (กัน .html/.svg/.php หลุดเข้ามา
 * และกัน path traversal ผ่านชื่อไฟล์ไปในตัว)
 */
export function safeExtensionFor(
  kind: UploadKind,
  mimetype: string,
): string | null {
  const allowed = kind.allow[mimetype];
  return allowed ? allowed[0] : null;
}

/** ใช้เป็น fileFilter ของ multer — กรองชั้นแรกจาก mimetype + นามสกุล */
export function makeFileFilter(kind: UploadKind) {
  return (
    _req: unknown,
    file: { originalname: string; mimetype: string },
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedExts = kind.allow[file.mimetype];
    if (!allowedExts) {
      return cb(new BadRequestException(`รองรับเฉพาะ${kind.label}`), false);
    }

    const lower = file.originalname.toLowerCase();
    if (!allowedExts.some((ext) => lower.endsWith(ext))) {
      return cb(
        new BadRequestException(`นามสกุลไฟล์ไม่ตรงกับชนิดไฟล์ที่ส่งมา`),
        false,
      );
    }

    cb(null, true);
  };
}

/**
 * ตรวจ magic bytes จากเนื้อไฟล์ที่อัปโหลดจริง (buffer ใน memory ก่อนจะเขียนลงที่เก็บใดๆ)
 * เป็นด่านสุดท้ายที่ปลอมด้วย header ของ HTTP ไม่ได้ เพราะอ่านจากเนื้อไฟล์จริง ไม่ใช่ชื่อ/mimetype ที่ประกาศมา
 *
 * เดิมเขียนไฟล์ลงดิสก์ก่อนแล้วเปิดกลับมาอ่าน (multer diskStorage) — ย้ายมาตรวจจาก buffer ตรง ๆ
 * เพราะที่เก็บไฟล์ตอนนี้เลือกได้ทั้งดิสก์และ R2 (ดู modules/shared/storage) ไม่มี "ไฟล์บนดิสก์" ให้เปิดอ่านเสมอไป
 */
export function assertRealFileType(kind: UploadKind, buffer: Buffer): void {
  const header = buffer.subarray(0, 8);

  const matches = kind.signatures.some((sig) =>
    sig.every((byte, i) => header[i] === byte),
  );

  if (!matches) {
    throw new BadRequestException(`เนื้อหาไฟล์ไม่ใช่${kind.label} จริง`);
  }
}
