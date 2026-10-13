import { ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

const USER_ID = 10;

function storedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'Org Name',
    email: 'org@example.com',
    username: 'org-abc123',
    password: '$2a$12$placeholderhash', // ไม่ต้อง hash จริง — ทุกเทสต่อ bcrypt.compare เอง
    ...overrides,
  };
}

describe('UsersService.updateProfile', () => {
  let service: UsersService;
  let repo: { findByIdWithPassword: jest.Mock; update: jest.Mock };
  let compareSpy: jest.SpyInstance;

  beforeEach(() => {
    repo = {
      findByIdWithPassword: jest.fn().mockResolvedValue(storedUser()),
      update: jest.fn().mockResolvedValue({ ...storedUser(), password: undefined }),
    };
    service = new UsersService(repo as unknown as UsersRepository);
    // ไม่ hash รหัสผ่านจริงในสโตร์ตัวอย่าง — สั่งให้ compare ผ่านเมื่อค่าที่ส่งมาคือ 'correct-pass' เท่านั้น
    compareSpy = jest.spyOn(bcrypt, 'compare').mockImplementation(async (plain) => plain === 'correct-pass');
  });

  afterEach(() => {
    compareSpy.mockRestore();
  });

  it('ไม่ส่ง currentPassword → ForbiddenException และไม่เขียน', async () => {
    await expect(service.updateProfile(USER_ID, { name: 'New Name' } as any)).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('currentPassword ผิด → ForbiddenException และไม่เขียน', async () => {
    await expect(
      service.updateProfile(USER_ID, { name: 'New Name', currentPassword: 'wrong' } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('ไม่พบผู้ใช้ → NotFoundException', async () => {
    repo.findByIdWithPassword.mockResolvedValue(null);
    await expect(
      service.updateProfile(999, { name: 'x', currentPassword: 'correct-pass' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('แก้ name/username/phone พร้อมกันได้ในคำขอเดียว', async () => {
    await service.updateProfile(USER_ID, {
      name: 'New Name',
      username: 'new-username',
      phone: '0812345678',
      currentPassword: 'correct-pass',
    } as any);

    expect(repo.update).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ name: 'New Name', username: 'new-username', phone: '0812345678' }),
    );
  });

  it('username ซ้ำกับคนอื่น (P2002 จาก DB) → ConflictException พร้อมข้อความชัดเจน', async () => {
    repo.update.mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));

    await expect(
      service.updateProfile(USER_ID, { username: 'taken', currentPassword: 'correct-pass' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('error อื่นที่ไม่ใช่ P2002 ถูก throw ต่อตามเดิม ไม่ถูกกลืนเป็น ConflictException', async () => {
    repo.update.mockRejectedValue(new Error('db down'));
    await expect(
      service.updateProfile(USER_ID, { name: 'x', currentPassword: 'correct-pass' } as any),
    ).rejects.toThrow('db down');
  });

  it('ไม่ส่ง newPassword = ไม่แตะรหัสผ่านเดิม', async () => {
    await service.updateProfile(USER_ID, { name: 'x', currentPassword: 'correct-pass' } as any);
    const data = repo.update.mock.calls[0][1];
    expect(data.password).toBeUndefined();
  });

  it('ส่ง newPassword = hash แล้วค่อยเขียน (ไม่เก็บ plaintext)', async () => {
    await service.updateProfile(USER_ID, {
      newPassword: 'NewPass123',
      currentPassword: 'correct-pass',
    } as any);
    const data = repo.update.mock.calls[0][1];
    expect(data.password).toBeDefined();
    expect(data.password).not.toBe('NewPass123');
  });

  it('ไม่แตะฟิลด์ที่ไม่ได้ส่งมาเลย (เช่น แก้แค่ username ก็ไม่ส่ง name/phone เข้าไปใน data)', async () => {
    await service.updateProfile(USER_ID, { username: 'only-this', currentPassword: 'correct-pass' } as any);
    const data = repo.update.mock.calls[0][1];
    expect(data).toEqual({ username: 'only-this' });
  });
});
