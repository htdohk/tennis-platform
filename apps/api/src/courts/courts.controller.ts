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
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/courts')
@UseGuards(AdminGuard)
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Get()
  findAll(@Query('venueId') venueId?: string) {
    return this.courtsService.findAll(venueId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCourtDto) {
    return this.courtsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCourtDto) {
    return this.courtsService.update(id, dto);
  }

  @Post(':id/maintenance')
  addMaintenance(@Param('id') id: string, @Body() dto: CreateMaintenanceDto) {
    return this.courtsService.addMaintenance(id, dto);
  }
}
