import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersProfileController } from './users-profile.controller';

// No bare `:id` route exists anywhere in the users domain (admin routes are all
// suffixed, e.g. `:id/role`, `:id/block`) — safe to keep the shared `me` controller
// directly on this module, no separate "public module" split needed (unlike
// activities/certificates).
@Module({
  controllers: [UsersProfileController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
