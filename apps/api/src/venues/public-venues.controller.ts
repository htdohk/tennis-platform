import { Controller, Get, Param } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CourtsService } from '../courts/courts.service';

@Controller('api/venues')
export class PublicVenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    private readonly courtsService: CourtsService,
  ) {}

  @Get()
  findAll() {
    return this.venuesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Get(':id/courts')
  findCourts(@Param('id') id: string) {
    return this.courtsService.findAll(id);
  }
}
