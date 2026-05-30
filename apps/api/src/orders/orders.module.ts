import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  OrdersController,
  CourtAvailabilityController,
} from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminScheduleController } from './admin-schedule.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { PriceCalculator } from './price-calculator';

@Module({
  controllers: [
    OrdersController,
    AdminOrdersController,
    AdminScheduleController,
    AdminDashboardController,
    CourtAvailabilityController,
  ],
  providers: [OrdersService, PriceCalculator],
  exports: [OrdersService, PriceCalculator],
})
export class OrdersModule {}
