import { Module } from '@nestjs/common';
import { InternalCourtsController } from './internal-courts.controller';
import { InternalOrdersController } from './internal-orders.controller';
import { InternalUsersController } from './internal-users.controller';
import { InternalRecruitsController } from './internal-recruits.controller';
import { InternalNotifyController } from './internal-notify.controller';
import { InternalAuthGuard } from './internal-auth.guard';

@Module({
  controllers: [
    InternalCourtsController,
    InternalOrdersController,
    InternalUsersController,
    InternalRecruitsController,
    InternalNotifyController,
  ],
  providers: [InternalAuthGuard],
})
export class InternalModule {}
