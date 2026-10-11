import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { MailService } from "../mail/mail.service";
import type { RegisterDto } from "./dto/register.dto";

/**
 * สมัครสมาชิก (นักศึกษา) ไม่ออก session ทันที — ต้องยืนยัน OTP ที่ส่งไปอีเมลก่อน
 * (register -> pendingVerification, verifyRegistrationOtp -> session จริง) แล้ว login ก็ต้องกั้น
 * บัญชีที่ยังไม่ยืนยันไว้ด้วย ไม่งั้นสมัครแล้วข้าม OTP ไปล็อกอินตรงๆ ได้เลย
 *
 * verifyRegistrationOtp เป็น endpoint ที่ไม่มี session นำหน้าแต่ออก session ให้ได้ จึงมี 2 กติกาที่ห้ามถอย:
 * ไม่ออก session ให้บัญชีที่ยืนยันแล้วเด็ดขาด และต้องได้ทั้ง OTP + รหัสผ่านของคำขอล่าสุด
 * (ไฟล์นี้โฟกัสเฉพาะส่วนสมัคร/ยืนยัน/login gate — adminLogin/acceptAdminInvite/getProfile ไม่ได้ทดสอบที่นี่)
 */
describe("AuthService — registration OTP gate", () => {
  let service: AuthService;
  let authRepository: {
    findUserByEmail: jest.Mock;
    findUserById: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
    overwritePendingRegistration: jest.Mock;
    markRegistrationVerified: jest.Mock;
  };
  let mailService: {
    sendRegistrationOtp: jest.Mock;
    sendVerificationOtp: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const VALID_REGISTER_DTO: RegisterDto = {
    name: "สมชาย ใจดี",
    email: "Student@KKUmail.com", // ตั้งใจใส่ตัวพิมพ์ใหญ่ปนเพื่อเช็ค normalize เป็น lowercase
    phone: "0812345678",
    educationLevel: "bachelor",
    program: "cs",
    password: "Passw0rd2026",
  };

  function makeUserRow(overrides: Partial<Record<string, any>> = {}) {
    return {
      id: 1,
      name: "สมชาย ใจดี",
      email: "student@kkumail.com",
      password: "hashed",
      role: "student",
      studentId: null,
      username: null,
      validUntil: null,
      phone: "0812345678",
      educationLevel: "bachelor",
      program: "cs",
      isBlocked: false,
      isVerified: false,
      verificationOtp: null,
      verificationOtpExpiresAt: null,
      verificationOtpAttempts: 0,
      ...overrides,
    };
  }

  beforeEach(async () => {
    authRepository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      overwritePendingRegistration: jest.fn(),
      markRegistrationVerified: jest.fn(),
    };
    mailService = {
      sendRegistrationOtp: jest.fn().mockResolvedValue(undefined),
      sendVerificationOtp: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = { sign: jest.fn(() => "signed.jwt.token") };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("register", () => {
    it("creates an unverified user, sends the registration OTP email, and returns pendingVerification (no token)", async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUser.mockImplementation((data) =>
        Promise.resolve(makeUserRow(data)),
      );

      const result = await service.register(VALID_REGISTER_DTO);

      expect(result).toEqual({
        pendingVerification: true,
        email: "student@kkumail.com",
      });
      expect(result).not.toHaveProperty("accessToken");

      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "student@kkumail.com",
          isVerified: false,
          role: "student",
        }),
      );
      // รหัสผ่านต้อง hash ไว้ ไม่ใช่เก็บ plaintext
      const createdPassword =
        authRepository.createUser.mock.calls[0][0].password;
      expect(createdPassword).not.toBe(VALID_REGISTER_DTO.password);
      expect(
        await bcrypt.compare(VALID_REGISTER_DTO.password, createdPassword),
      ).toBe(true);

      expect(mailService.sendRegistrationOtp).toHaveBeenCalledTimes(1);
      const [sentEmail, sentName, sentOtp] =
        mailService.sendRegistrationOtp.mock.calls[0];
      expect(sentEmail).toBe("student@kkumail.com");
      expect(sentName).toBe(VALID_REGISTER_DTO.name);
      expect(sentOtp).toMatch(/^\d{6}$/);

      // OTP ที่ส่งไปอีเมลต้องตรงกับที่บันทึกไว้ในแถว user (ผ่าน updateUser หลัง createUser)
      expect(authRepository.updateUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ verificationOtp: sentOtp }),
      );
    });

    it("rejects with Conflict when the email already belongs to a verified account", async () => {
      authRepository.findUserByEmail.mockResolvedValue(
        makeUserRow({ isVerified: true }),
      );

      await expect(service.register(VALID_REGISTER_DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(authRepository.createUser).not.toHaveBeenCalled();
      expect(
        authRepository.overwritePendingRegistration,
      ).not.toHaveBeenCalled();
      expect(mailService.sendRegistrationOtp).not.toHaveBeenCalled();
    });

    it("overwrites an abandoned unverified registration for the same email instead of conflicting", async () => {
      authRepository.findUserByEmail.mockResolvedValue(
        makeUserRow({ id: 42, isVerified: false }),
      );
      authRepository.overwritePendingRegistration.mockImplementation(
        (id, data) => Promise.resolve(makeUserRow({ ...data, id })),
      );

      const result = await service.register(VALID_REGISTER_DTO);

      expect(result).toEqual({
        pendingVerification: true,
        email: "student@kkumail.com",
      });
      expect(authRepository.createUser).not.toHaveBeenCalled();
      expect(authRepository.overwritePendingRegistration).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ isVerified: false }),
      );
      expect(mailService.sendRegistrationOtp).toHaveBeenCalledTimes(1);
    });

    it("refuses with Conflict (and sends no mail) when the pending row got verified while this request was hashing", async () => {
      authRepository.findUserByEmail.mockResolvedValue(
        makeUserRow({ id: 42, isVerified: false }),
      );
      // compare-and-set แพ้: ตอนเขียน แถวไม่ใช่ isVerified:false แล้ว
      authRepository.overwritePendingRegistration.mockResolvedValue(null);

      await expect(service.register(VALID_REGISTER_DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(authRepository.updateUser).not.toHaveBeenCalled();
      expect(mailService.sendRegistrationOtp).not.toHaveBeenCalled();
    });

    it("still validates educationLevel/program cross-field match before touching the database", async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.register({
          ...VALID_REGISTER_DTO,
          educationLevel: "bachelor",
          program: "m_cs_it",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(authRepository.createUser).not.toHaveBeenCalled();
      expect(mailService.sendRegistrationOtp).not.toHaveBeenCalled();
    });
  });

  describe("verifyRegistrationOtp", () => {
    const PASSWORD = "Passw0rd2026";
    let passwordHash: string;

    beforeAll(async () => {
      passwordHash = await bcrypt.hash(PASSWORD, 4);
    });

    function pendingRow(overrides: Partial<Record<string, any>> = {}) {
      return makeUserRow({
        password: passwordHash,
        verificationOtp: "123456",
        verificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        ...overrides,
      });
    }

    it("activates the account and returns a session for the correct OTP + registration password", async () => {
      const pending = pendingRow();
      authRepository.findUserByEmail.mockResolvedValue(pending);
      authRepository.markRegistrationVerified.mockResolvedValue({
        ...pending,
        isVerified: true,
        verificationOtp: null,
      });

      const result = await service.verifyRegistrationOtp(
        "student@kkumail.com",
        "123456",
        PASSWORD,
      );

      expect(result).toHaveProperty("accessToken", "signed.jwt.token");
      expect(result.user).toMatchObject({
        email: "student@kkumail.com",
        role: "student",
      });
      // compare-and-set ต้องผูกกับ "คำขอที่เพิ่งตรวจผ่าน" — รหัสผ่านเดิมบนแถวและ OTP เดิม
      expect(authRepository.markRegistrationVerified).toHaveBeenCalledWith(
        1,
        passwordHash,
        "123456",
      );
    });

    it("never issues a session for an already-verified account — whatever OTP and password are sent", async () => {
      // แถวที่ยืนยันแล้ว แม้จะมี OTP ค้างอยู่ (จาก flow send-otp ตอนล็อกอิน) และส่งรหัสผ่านถูกมาด้วยก็ตาม
      const verified = pendingRow({ isVerified: true });
      authRepository.findUserByEmail.mockResolvedValue(verified);

      for (const [otp, password] of [
        ["000000", "not-the-password"],
        ["123456", PASSWORD],
      ]) {
        await expect(
          service.verifyRegistrationOtp("student@kkumail.com", otp, password),
        ).rejects.toThrow(UnauthorizedException);
      }

      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(authRepository.updateUser).not.toHaveBeenCalled();
      expect(authRepository.markRegistrationVerified).not.toHaveBeenCalled();
    });

    it("rejects a wrong OTP without activating the account, and counts the attempt", async () => {
      authRepository.findUserByEmail.mockResolvedValue(pendingRow());

      await expect(
        service.verifyRegistrationOtp(
          "student@kkumail.com",
          "000000",
          PASSWORD,
        ),
      ).rejects.toThrow("รหัส OTP ไม่ถูกต้อง");
      expect(authRepository.updateUser).toHaveBeenCalledWith(1, {
        verificationOtpAttempts: 1,
      });
      expect(authRepository.markRegistrationVerified).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it("rejects the correct OTP with the wrong password — and keeps the OTP usable for a retry", async () => {
      authRepository.findUserByEmail.mockResolvedValue(pendingRow());

      await expect(
        service.verifyRegistrationOtp(
          "student@kkumail.com",
          "123456",
          "WrongPassw0rd",
        ),
      ).rejects.toThrow("รหัสผ่านไม่ตรงกับที่ใช้สมัครครั้งล่าสุด");
      // ไม่เผา/ล้าง OTP และไม่นับ attempt — พิมพ์รหัสผ่านผิดไม่ควรทำให้ต้องขอ OTP ใหม่
      expect(authRepository.updateUser).not.toHaveBeenCalled();
      expect(authRepository.markRegistrationVerified).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it("rejects when the row changed between the check and the write (compare-and-set lost)", async () => {
      authRepository.findUserByEmail.mockResolvedValue(pendingRow());
      authRepository.markRegistrationVerified.mockResolvedValue(null);

      await expect(
        service.verifyRegistrationOtp(
          "student@kkumail.com",
          "123456",
          PASSWORD,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it("rejects an expired OTP", async () => {
      authRepository.findUserByEmail.mockResolvedValue(
        pendingRow({ verificationOtpExpiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.verifyRegistrationOtp(
          "student@kkumail.com",
          "123456",
          PASSWORD,
        ),
      ).rejects.toThrow("รหัส OTP หมดอายุแล้ว โปรดขอรหัสใหม่");
    });

    it("rejects an email with no pending registration (same message as an already-verified one)", async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);
      const unknownMsg = await service
        .verifyRegistrationOtp("nobody@kkumail.com", "123456", PASSWORD)
        .catch((e: Error) => e.message);

      authRepository.findUserByEmail.mockResolvedValue(
        pendingRow({ isVerified: true }),
      );
      const verifiedMsg = await service
        .verifyRegistrationOtp("student@kkumail.com", "123456", PASSWORD)
        .catch((e: Error) => e.message);

      expect(unknownMsg).toContain("ไม่พบคำขอสมัครที่รอยืนยัน");
      expect(verifiedMsg).toBe(unknownMsg);
      expect(authRepository.updateUser).not.toHaveBeenCalled();
    });

    it("burns the OTP after MAX_OTP_ATTEMPTS wrong guesses — the correct code no longer works afterwards", async () => {
      let row = pendingRow();
      authRepository.findUserByEmail.mockImplementation(() =>
        Promise.resolve(row),
      );
      authRepository.updateUser.mockImplementation((_id, data) => {
        row = { ...row, ...data };
        return Promise.resolve(row);
      });

      for (let i = 0; i < 5; i++) {
        await expect(
          service.verifyRegistrationOtp(
            "student@kkumail.com",
            "000000",
            PASSWORD,
          ),
        ).rejects.toThrow(UnauthorizedException);
      }
      // โควตาหมดแล้ว — otp ถูกเผาทิ้ง (เป็น null) ตั้งแต่ครั้งที่ 5
      expect(row.verificationOtp).toBeNull();

      // ต่อให้กรอกรหัสที่ "เคย" ถูกต้อง ก็ใช้ไม่ได้อีกแล้วเพราะ otp ในแถวเป็น null ไปแล้ว
      await expect(
        service.verifyRegistrationOtp(
          "student@kkumail.com",
          "123456",
          PASSWORD,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(authRepository.markRegistrationVerified).not.toHaveBeenCalled();
    });

    it("an attacker re-registering a victim's pending email cannot end up owning the account", async () => {
      // repository ในหน่วยความจำที่ทำตัวเหมือนของจริง (คืนสำเนาแบบ Prisma, รวม compare-and-set) — ไล่ทั้งเหตุการณ์ต่อเนื่องกัน
      const rows = new Map<string, any>();
      const copyOf = (row: any) => (row ? { ...row } : null);
      const byId = (id: number) => [...rows.values()].find((r) => r.id === id);
      authRepository.findUserByEmail.mockImplementation((email: string) =>
        Promise.resolve(copyOf(rows.get(email))),
      );
      authRepository.createUser.mockImplementation((data) => {
        const row = makeUserRow({ ...data, id: 7 });
        rows.set(row.email, row);
        return Promise.resolve(copyOf(row));
      });
      authRepository.updateUser.mockImplementation((id, data) =>
        Promise.resolve(copyOf(Object.assign(byId(id), data))),
      );
      authRepository.overwritePendingRegistration.mockImplementation(
        (id, data) => {
          const row = byId(id);
          return Promise.resolve(
            row && !row.isVerified ? copyOf(Object.assign(row, data)) : null,
          );
        },
      );
      authRepository.markRegistrationVerified.mockImplementation(
        (id, hash, otp) => {
          const row = byId(id);
          if (
            !row ||
            row.isVerified ||
            row.password !== hash ||
            row.verificationOtp !== otp
          ) {
            return Promise.resolve(null);
          }
          Object.assign(row, { isVerified: true, verificationOtp: null });
          return Promise.resolve(copyOf(row));
        },
      );
      // OTP ทุกฉบับไปที่กล่องเมลของเหยื่อ — ผู้โจมตีไม่เห็น
      const latestMailedOtp = () => {
        const calls = mailService.sendRegistrationOtp.mock.calls;
        return calls[calls.length - 1][2] as string;
      };

      const victim = { ...VALID_REGISTER_DTO, password: "VictimPassw0rd" };
      const attacker = {
        ...VALID_REGISTER_DTO,
        name: "ผู้โจมตี",
        password: "AttackerPassw0rd",
      };

      await service.register(victim);
      await service.register(attacker); // ทับคำขอของเหยื่อระหว่างที่เหยื่อรอเมล

      // เหยื่อกรอก OTP ฉบับล่าสุดในกล่องเมล (ของคำขอผู้โจมตี) พร้อมรหัสผ่านตัวเอง — ต้องไม่ยืนยันให้
      await expect(
        service.verifyRegistrationOtp(
          victim.email,
          latestMailedOtp(),
          victim.password,
        ),
      ).rejects.toThrow("รหัสผ่านไม่ตรงกับที่ใช้สมัครครั้งล่าสุด");
      // ผู้โจมตีมีรหัสผ่านแต่ไม่มี OTP
      await expect(
        service.verifyRegistrationOtp(
          attacker.email,
          latestMailedOtp() === "999999" ? "999998" : "999999",
          attacker.password,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(rows.get("student@kkumail.com").isVerified).toBe(false);

      // เหยื่อสมัครใหม่ (ทับคืน) แล้วยืนยันด้วย OTP ฉบับใหม่ — บัญชีเป็นของเหยื่อ ไม่ใช่ผู้โจมตี
      await service.register(victim);
      const session = await service.verifyRegistrationOtp(
        victim.email,
        latestMailedOtp(),
        victim.password,
      );
      const finalRow = rows.get("student@kkumail.com");
      expect(session).toHaveProperty("accessToken");
      expect(finalRow.isVerified).toBe(true);
      expect(finalRow.name).toBe(victim.name);
      expect(await bcrypt.compare(victim.password, finalRow.password)).toBe(
        true,
      );
      expect(await bcrypt.compare(attacker.password, finalRow.password)).toBe(
        false,
      );
    }, 20_000);
  });

  describe("resendRegistrationOtp", () => {
    it("sends a fresh OTP for a pending (unverified) account", async () => {
      authRepository.findUserByEmail.mockResolvedValue(
        makeUserRow({ isVerified: false }),
      );

      const result = await service.resendRegistrationOtp("student@kkumail.com");

      expect(result.message).toContain("ส่งรหัส OTP ใหม่ไปแล้ว");
      expect(mailService.sendRegistrationOtp).toHaveBeenCalledTimes(1);
    });

    it("returns the same generic message without sending mail for an already-verified account", async () => {
      authRepository.findUserByEmail.mockResolvedValue(
        makeUserRow({ isVerified: true }),
      );

      const result = await service.resendRegistrationOtp("student@kkumail.com");

      expect(result.message).toContain("ส่งรหัส OTP ใหม่ไปแล้ว");
      expect(mailService.sendRegistrationOtp).not.toHaveBeenCalled();
    });

    it("returns the same generic message without sending mail for an unknown email (no enumeration)", async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);

      const result = await service.resendRegistrationOtp("nobody@kkumail.com");

      expect(result.message).toContain("ส่งรหัส OTP ใหม่ไปแล้ว");
      expect(mailService.sendRegistrationOtp).not.toHaveBeenCalled();
      expect(authRepository.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("login — unverified-account gate", () => {
    const LOGIN_PASSWORD = "Passw0rd2026";

    async function userWithPassword(
      overrides: Partial<Record<string, any>> = {},
    ) {
      return makeUserRow({
        password: await bcrypt.hash(LOGIN_PASSWORD, 4),
        ...overrides,
      });
    }

    it("refuses login for a correct password on an unverified account", async () => {
      authRepository.findUserByEmail.mockResolvedValue(
        await userWithPassword({ isVerified: false }),
      );

      await expect(
        service.login({
          identifier: "student@kkumail.com",
          password: LOGIN_PASSWORD,
        }),
      ).rejects.toThrow("บัญชีนี้ยังไม่ได้ยืนยันอีเมล");
    });

    it("still logs in normally once verified (no regression on the happy path)", async () => {
      authRepository.findUserByEmail.mockResolvedValue(
        await userWithPassword({ isVerified: true }),
      );

      const result = await service.login({
        identifier: "student@kkumail.com",
        password: LOGIN_PASSWORD,
      });

      expect(result).toHaveProperty("accessToken");
    });
  });
});
