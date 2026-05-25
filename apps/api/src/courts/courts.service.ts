import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';

@Injectable()
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(venueId?: string) {
    return this.prisma.court.findMany({
      where: venueId ? { venueId } : undefined,
      include: { maintenances: true },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: { maintenances: true },
    });
    if (!court) throw new NotFoundException('场地不存在');
    return court;
  }

  create(dto: CreateCourtDto) {
    return this.prisma.court.create({ data: dto });
  }

  async update(id: string, dto: UpdateCourtDto) {
    await this.findOne(id);
    return this.prisma.court.update({ where: { id }, data: dto });
  }

  async addMaintenance(courtId: string, dto: CreateMaintenanceDto) {
    await this.findOne(courtId);
    return this.prisma.courtMaintenance.create({
      data: { courtId, ...dto },
    });
  }
}
