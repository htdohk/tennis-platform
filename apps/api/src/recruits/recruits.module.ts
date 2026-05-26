import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { RecruitsService } from './recruits.service';
import { RecruitsController } from './recruits.controller';
import { AdminRecruitsController } from './admin-recruits.controller';

@Module({
  imports: [OrdersModule],
  controllers: [RecruitsController, AdminRecruitsController],
  providers: [RecruitsService],
  exports: [RecruitsService],
})
export class RecruitsModule {}
