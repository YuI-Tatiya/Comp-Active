import { registerAs } from '@nestjs/config';

export default registerAs('gateway', () => ({
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminFrontendUrl: process.env.ADMIN_FRONTEND_URL || 'http://admin.localhost:3000',
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || 1),
}));
