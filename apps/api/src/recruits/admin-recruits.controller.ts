import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { RecruitsService } from './recruits.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/recruits')
@UseGuards(AdminGuard)
export class AdminRecruitsController {
  constructor(private readonly recruitsService: RecruitsService) {}

  @Get()
  findAll() {
    return this.recruitsService.findAllAdmin();
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.recruitsService.cancelByAdmin(id);
  }
}
