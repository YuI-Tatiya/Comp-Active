import { existsSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { StorageService } from "./storage.service";
import { IMAGE_UPLOAD } from "../../../common/utils/upload.util";

const sendMock = jest.fn().mockResolvedValue({});
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

function makeConfig(values: Record<string, unknown>) {
  return { get: (key: string) => values[key] } as any;
}

const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * ไม่ตั้งค่า R2 = ตกกลับไปเขียนดิสก์เหมือนเดิม (dev ergonomics — ดูเหตุผลใน storage.config.ts)
 * ตั้งค่า R2 ครบ = อัปโหลดขึ้น R2 จริง ไม่แตะดิสก์เลย — ทั้งสองโหมดต้องคืน URL ที่ frontend แสดงผลได้ตรงๆ
 */
describe("StorageService", () => {
  afterEach(() => {
    sendMock.mockClear();
  });

  describe("ไม่ได้ตั้งค่า R2", () => {
    const uploadsDir = join(
      process.cwd(),
      "public",
      "uploads",
      "storage-service-test",
    );
    afterEach(() => {
      rmSync(uploadsDir, { recursive: true, force: true });
    });

    it("เขียนไฟล์ลงดิสก์ที่ public/uploads/<folder>/ และคืน path สัมพัทธ์ /uploads/...", async () => {
      const service = new StorageService(
        makeConfig({ "storage.configured": false }),
      );

      const saved = await service.save(
        PNG_BUFFER,
        IMAGE_UPLOAD,
        "image/png",
        "storage-service-test",
      );

      expect(saved.url).toMatch(
        /^\/uploads\/storage-service-test\/[0-9a-f-]+\.png$/,
      );
      expect(service.usingR2).toBe(false);
      const diskPath = join(process.cwd(), "public", saved.url);
      expect(existsSync(diskPath)).toBe(true);
      expect(readFileSync(diskPath)).toEqual(PNG_BUFFER);
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe("ตั้งค่า R2 ครบ", () => {
    function makeR2Config() {
      return makeConfig({
        "storage.configured": true,
        "storage.bucket": "test-bucket",
        "storage.publicUrl": "https://cdn.example.test",
        "storage.endpoint": "https://acct.r2.cloudflarestorage.com",
        "storage.accessKeyId": "key",
        "storage.secretAccessKey": "secret",
      });
    }

    it("อัปโหลดขึ้น R2 (ไม่แตะดิสก์) และคืน URL เต็มของโดเมนสาธารณะ", async () => {
      const service = new StorageService(makeR2Config());

      const saved = await service.save(
        PNG_BUFFER,
        IMAGE_UPLOAD,
        "image/png",
        "activities",
      );

      expect(service.usingR2).toBe(true);
      expect(saved.url).toMatch(
        /^https:\/\/cdn\.example\.test\/activities\/[0-9a-f-]+\.png$/,
      );
      expect(sendMock).toHaveBeenCalledTimes(1);
      const call = sendMock.mock.calls[0][0];
      expect(call.input).toMatchObject({
        Bucket: "test-bucket",
        Body: PNG_BUFFER,
        ContentType: "image/png",
      });
      expect(call.input.ContentDisposition).toBeUndefined();
    });

    it("ตั้ง ContentDisposition เมื่อระบุมา (ไฟล์แนบต้องบังคับดาวน์โหลดเสมอ)", async () => {
      const service = new StorageService(makeR2Config());

      await service.save(
        PNG_BUFFER,
        IMAGE_UPLOAD,
        "image/png",
        "attachments",
        "attachment",
      );

      const call = sendMock.mock.calls[0][0];
      expect(call.input.ContentDisposition).toBe("attachment");
    });
  });

  it("ปฏิเสธ mimetype ที่ไม่อยู่ใน allowlist ของ UploadKind นั้น", async () => {
    const service = new StorageService(
      makeConfig({ "storage.configured": false }),
    );

    await expect(
      service.save(PNG_BUFFER, IMAGE_UPLOAD, "text/html", "activities"),
    ).rejects.toThrow();
  });
});
