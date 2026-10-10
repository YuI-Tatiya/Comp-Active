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
 * สมัครสมาชิก (นักศึกษา) ไม่ออก session ทันทีอีกต่อไป — ต้องยืนยัน OTP ที่ส่งไปอีเมลก่อน
 * (register -> pendingVerification, verifyRegistrationOtp -> session จริง) แล้ว login ก็ต้องกั้น
 * บัญชีที่ยังไม่ยืนยันไว้ด้วย ไม่งั้นสมัครแล้วข้าม OTP ไปล็อกอินตรงๆ ได้เลย — ไฟล์นี้เพิ่งสร้างใหม่
 * (ไม่เคยมีสเปกของ AuthService มาก่อน) จึงโฟกัสเฉพาะส่วนที่แก้/เพิ่มในรอบนี้ ไม่ไล่ครบทุกเมธอดเดิม
 * (adminLogin/acceptAdminInvite/getProfile ไม่ได้แตะ ไม่ทดสอบซ้ำที่นี่)
 */
describe("AuthService — registration OTP gate", () => {
  let service: AuthService;
  let authRepository: {
    findUserByEmail: jest.Mock;
    findUserById: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
  };
  let mailService: {
    sendRegistrationOtp: jest.Mock;
    sendVerificationOtp: jest.Mock;
  };

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
    };
    mailService = {
      sendRegistrationOtp: jest.fn().mockResolvedValue(undefined),
      sendVerificationOtp: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => "signed.jwt.token") },
        },
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
      expect(mailService.sendRegistrationOtp).not.toHaveBeenCalled();
    });

    it("overwrites an abandoned unverified registration for the same email instead of conflicting", async () => {
      const existing = makeUserRow({ id: 42, isVerified: false });
      authRepository.findUserByEmail.mockResolvedValue(existing);
      authRepository.updateUser.mockImplementation((id, data) =>
        Promise.resolve(makeUserRow({ ...data, id })),
      );

      const result = await service.register(VALID_REGISTER_DTO);

      expect(result).toEqual({
        pendingVerification: true,
        email: "student@kkumail.com",
      });
      expect(authRepository.createUser).not.toHaveBeenCalled();
      // 2 ครั้ง: 1) เขียนข้อมูลสมัครใหม่ทับแถวเดิม 2) บันทึก OTP รอบใหม่
      expect(authRepository.updateUser).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ isVerified: false }),
      );
      expect(mailService.sendRegistrationOtp).toHaveBeenCalledTimes(1);
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
    it("activates the account and returns a real session on a correct, unexpired OTP", async () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const pending = makeUserRow({
        verificationOtp: "123456",
        verificationOtpExpiresAt: expiresAt,
      });
      authRepository.findUserByEmail.mockResolvedValue(pending);
      authRepository.updateUser.mockResolvedValue({
        ...pending,
        isVerified: true,
      });

      const result = await service.verifyRegistrationOtp(
        "student@kkumail.com",
        "123456",
      );

      expect(result).toHaveProperty("accessToken", "signed.jwt.token");
      expect(result.user).toMatchObject({
        email: "student@kkumail.com",
        role: "student",
      });
      expect(authRepository.updateUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          verificationOtp: null,
          verificationOtpAttempts: 0,
        }),
      );
      expect(authRepository.updateUser).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isVerified: true }),
      );
    });

    it("rejects a wrong OTP without activating the account", async () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const pending = makeUserRow({
        verificationOtp: "123456",
        verificationOtpExpiresAt: expiresAt,
      });
      authRepository.findUserByEmail.mockResolvedValue(pending);

      await expect(
        service.verifyRegistrationOtp("student@kkumail.com", "000000"),
      ).rejects.toThrow(UnauthorizedException);
      expect(authRepository.updateUser).not.toHaveBeenCalledWith(
        1,
        expect.objectContaining({ isVerified: true }),
      );
    });

    it("rejects an expired OTP", async () => {
      const expiresAt = new Date(Date.now() - 1000); // เพิ่งหมดอายุไปแล้ว
      const pending = makeUserRow({
        verificationOtp: "123456",
        verificationOtpExpiresAt: expiresAt,
      });
      authRepository.findUserByEmail.mockResolvedValue(pending);

      await expect(
        service.verifyRegistrationOtp("student@kkumail.com", "123456"),
      ).rejects.toThrow("รหัส OTP หมดอายุแล้ว โปรดขอรหัสใหม่");
    });

    it("rejects an email with no pending registration (generic message — no enumeration)", async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.verifyRegistrationOtp("nobody@kkumail.com", "123456"),
      ).rejects.toThrow(UnauthorizedException);
      expect(authRepository.updateUser).not.toHaveBeenCalled();
    });

    it("is idempotent for an already-verified account — succeeds and logs in even with a garbage OTP", async () => {
      const verified = makeUserRow({ isVerified: true, verificationOtp: null });
      authRepository.findUserByEmail.mockResolvedValue(verified);

      const result = await service.verifyRegistrationOtp(
        "student@kkumail.com",
        "not-a-real-otp",
      );

      expect(result).toHaveProperty("accessToken");
      // ไม่ควรไปยุ่งกับแถวเลย เพราะยืนยันไปแล้วจริง ไม่มีอะไรต้องเขียนทับ
      expect(authRepository.updateUser).not.toHaveBeenCalled();
    });

    it("burns the OTP after MAX_OTP_ATTEMPTS wrong guesses — the correct code no longer works afterwards", async () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      let row = makeUserRow({
        verificationOtp: "123456",
        verificationOtpExpiresAt: expiresAt,
        verificationOtpAttempts: 0,
      });
      authRepository.findUserByEmail.mockImplementation(() =>
        Promise.resolve(row),
      );
      authRepository.updateUser.mockImplementation((_id, data) => {
        row = { ...row, ...data };
        return Promise.resolve(row);
      });

      for (let i = 0; i < 5; i++) {
        await expect(
          service.verifyRegistrationOtp("student@kkumail.com", "000000"),
        ).rejects.toThrow(UnauthorizedException);
      }
      // โควตาหมดแล้ว — otp ถูกเผาทิ้ง (เป็น null) ตั้งแต่ครั้งที่ 5
      expect(row.verificationOtp).toBeNull();

      // ต่อให้กรอกรหัสที่ "เคย" ถูกต้อง ก็ใช้ไม่ได้อีกแล้วเพราะ otp ในแถวเป็น null ไปแล้ว
      await expect(
        service.verifyRegistrationOtp("student@kkumail.com", "123456"),
      ).rejects.toThrow(UnauthorizedException);
    });
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
