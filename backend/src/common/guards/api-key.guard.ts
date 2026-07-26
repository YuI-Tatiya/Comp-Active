import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashToken } from '../utils';

/**
 * Guards the public developer API (api/v1/*). Self-contained like AdminIpGuard —
 * reads PrismaService directly rather than a feature-module service, keeping the
 * common → modules dependency direction one-way.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey = request.headers['x-api-key'];

    if (!rawKey || Array.isArray(rawKey)) {
      throw new UnauthorizedException('Missing API key');
    }

    const apiKey = await this.prisma.apiKey.findUnique({ where: { keyHash: hashToken(rawKey) } });

    if (!apiKey || !apiKey.isActive) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    request.apiKey = apiKey;
    // Fire-and-forget: last-used tracking shouldn't block or fail the request.
    this.prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

    return true;
  }
}
