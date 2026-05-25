import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';

@Injectable()
export class PricesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(venueId?: string) {
    return this.prisma.priceRule.findMany({
      where: venueId ? { venueId } : undefined,
      orderBy: [{ dateType: 'asc' }, { timeSlotType: 'asc' }],
    });
  }

  create(dto: CreatePriceRuleDto) {
    return this.prisma.priceRule.create({
      data: {
        ...dto,
        pricePer30min: dto.pricePer30min,
      },
    });
  }

  async findByVenue(venueId: string) {
    return this.prisma.priceRule.findMany({
      where: { venueId },
    });
  }
}
