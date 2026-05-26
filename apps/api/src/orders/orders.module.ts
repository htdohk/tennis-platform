import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  OrdersController,
  CourtAvailabilityController,
} from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { PriceCalculator } from './price-calculator';

@Module({
  controllers: [
    OrdersController,
    AdminOrdersController,
    CourtAvailabilityController,
  ],
  providers: [OrdersService, PriceCalculator],
  exports: [OrdersService, PriceCalculator],
})
export class OrdersModule {}
