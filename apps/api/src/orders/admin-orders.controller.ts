import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/orders')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.ordersService.findAll(status);
  }

  @Post()
  createByAdmin(
    @Body()
    dto: {
      userId: string;
      courtId: string;
      startAt: string;
      endAt: string;
      notes?: string;
    },
  ) {
    return this.ordersService.createByAdmin(dto);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.ordersService.transition(id, 'CONFIRMED');
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.ordersService.transition(id, 'CANCELLED');
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.ordersService.transition(id, 'COMPLETED');
  }

  @Patch(':id/mark-paid')
  markPaid(@Param('id') id: string) {
    return this.ordersService.markPaid(id);
  }
}
