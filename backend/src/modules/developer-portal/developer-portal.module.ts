import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRepository } from './api-key.repository';
import { ApiKeyController } from './api-key.controller';

@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyRepository],
  exports: [ApiKeyService, ApiKeyRepository],
})
export class DeveloperPortalModule {}
