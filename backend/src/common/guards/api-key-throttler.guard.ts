import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerRequest } from '@nestjs/throttler';

/**
 * Must run after ApiKeyGuard in the guard chain — reads `request.apiKey` set there
 * to key the rate-limit bucket per API key and to use that key's own `rateLimit`
 * instead of the static default. Falls back to IP-based tracking if `apiKey` is
 * ever absent so it degrades safely.
 */
@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.apiKey ? `api-key-${req.apiKey.id}` : req.ip;
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { req } = this.getRequestResponse(requestProps.context);
    if (req.apiKey?.rateLimit) {
      requestProps.limit = req.apiKey.rateLimit;
    }
    return super.handleRequest(requestProps);
  }
}
