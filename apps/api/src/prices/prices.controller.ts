import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PricesService } from './prices.service';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/prices')
@UseGuards(AdminGuard)
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get()
  findAll(@Query('venueId') venueId?: string) {
    return this.pricesService.findAll(venueId);
  }

  @Post()
  create(@Body() dto: CreatePriceRuleDto) {
    return this.pricesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePriceRuleDto>) {
    return this.pricesService.update(id, dto);
  }
}
