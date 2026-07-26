import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ApiKeyRepository } from './api-key.repository';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { generateSecureToken, hashToken } from '../../common/utils';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async create(ownerId: number, dto: CreateApiKeyDto) {
    const rawKey = generateSecureToken(24);
    const keyPrefix = rawKey.slice(0, 10);

    let apiKey;
    try {
      apiKey = await this.apiKeyRepository.create(
        ownerId,
        dto.label,
        hashToken(rawKey),
        keyPrefix,
        dto.rateLimit ?? 60,
      );
    } catch (error: any) {
      if (error?.code === 'P2002') {
        // Extremely rare hash collision — retry once with a fresh key.
        const retryKey = generateSecureToken(24);
        apiKey = await this.apiKeyRepository.create(
          ownerId,
          dto.label,
          hashToken(retryKey),
          retryKey.slice(0, 10),
          dto.rateLimit ?? 60,
        );
        this.logger.log(`API key created (after retry): "${dto.label}" (owner ${ownerId})`);
        return { ...apiKey, rawKey: retryKey };
      }
      throw error;
    }

    this.logger.log(`API key created: "${dto.label}" (owner ${ownerId})`);
    // Raw key is returned exactly once — only the hash is ever stored, mirroring AdminInvite's token pattern.
    return { ...apiKey, rawKey };
  }

  findAll() {
    return this.apiKeyRepository.findMany();
  }

  async update(id: number, data: { label?: string; rateLimit?: number; isActive?: boolean }) {
    const existing = await this.apiKeyRepository.findById(id);
    if (!existing) throw new NotFoundException('ไม่พบ API key');
    return this.apiKeyRepository.update(id, data);
  }

  async revoke(id: number) {
    const existing = await this.apiKeyRepository.findById(id);
    if (!existing) throw new NotFoundException('ไม่พบ API key');
    await this.apiKeyRepository.update(id, { isActive: false });
    this.logger.log(`API key revoked: ID ${id}`);
    return { message: 'เพิกถอน API key เรียบร้อยแล้ว' };
  }
}
