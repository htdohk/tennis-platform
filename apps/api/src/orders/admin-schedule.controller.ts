import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/schedule')
@UseGuards(AdminGuard)
export class AdminScheduleController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getSchedule(@Query('from') from: string, @Query('to') to: string) {
    return this.ordersService.getSchedule(from, to);
  }
}
