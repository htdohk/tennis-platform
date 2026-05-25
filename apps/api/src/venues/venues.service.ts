import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.venue.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('场馆不存在');
    return venue;
  }

  create(dto: CreateVenueDto) {
    return this.prisma.venue.create({ data: dto });
  }

  async update(id: string, dto: UpdateVenueDto) {
    await this.findOne(id);
    return this.prisma.venue.update({ where: { id }, data: dto });
  }
}
