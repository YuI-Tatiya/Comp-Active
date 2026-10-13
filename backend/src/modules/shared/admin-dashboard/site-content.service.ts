import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SiteContentRepository } from './site-content.repository';
import { UpsertSiteContentDto } from './dto/upsert-site-content.dto';

@Injectable()
export class SiteContentService {
  private readonly logger = new Logger(SiteContentService.name);

  constructor(private readonly siteContentRepository: SiteContentRepository) {}

  findAllPublic() {
    return this.siteContentRepository.findAllPublic();
  }

  findAllWithMeta() {
    return this.siteContentRepository.findAllWithMeta();
  }

  async upsert(key: string, dto: UpsertSiteContentDto, updatedById: number) {
    const saved = await this.siteContentRepository.upsert(key, dto, updatedById);
    this.logger.log(`Site content upserted: ${key}`);
    return saved;
  }

  async delete(key: string) {
    try {
      await this.siteContentRepository.delete(key);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException(`ไม่พบเนื้อหา key: ${key}`);
      }
      throw error;
    }
    this.logger.log(`Site content deleted: ${key}`);
    return { message: 'ลบเนื้อหาเรียบร้อยแล้ว' };
  }
}
