import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockList } from 'net';

/**
 * Inert by default. Only enforces once ADMIN_IP_ALLOWLIST_ENABLED=true — pairs with
 * `app.set('trust proxy', ...)` in main.ts, which must also be enabled for req.ip to be
 * trustworthy behind a reverse proxy (Cloudflare/ALB/etc).
 */
@Injectable()
export class AdminIpGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.config.get<string>('ADMIN_IP_ALLOWLIST_ENABLED') !== 'true') {
      return true;
    }

    const entries = (this.config.get<string>('ADMIN_IP_ALLOWLIST') || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const request = context.switchToHttp().getRequest();
    const clientIp: string | undefined = request.ips?.[0] || request.ip;

    // Enabled but nothing configured, or no resolvable client IP: fail closed, not open.
    if (entries.length === 0 || !clientIp) {
      throw new ForbiddenException('403 Forbidden');
    }

    const blockList = new BlockList();
    for (const entry of entries) {
      const [address, prefixStr] = entry.split('/');
      const family = address.includes(':') ? 'ipv6' : 'ipv4';
      const prefix = prefixStr ? parseInt(prefixStr, 10) : family === 'ipv6' ? 128 : 32;
      blockList.addSubnet(address, prefix, family);
    }

    const family = clientIp.includes(':') ? 'ipv6' : 'ipv4';
    if (!blockList.check(clientIp, family)) {
      throw new ForbiddenException('403 Forbidden');
    }

    return true;
  }
}
