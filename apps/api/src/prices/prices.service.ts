import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';

@Injectable()
export class PricesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(venueId?: string) {
    return this.prisma.priceRule.findMany({
      where: venueId ? { venueId } : undefined,
      include: { venue: { select: { name: true } } },
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

  async update(id: string, dto: Partial<CreatePriceRuleDto>) {
    const existing = await this.prisma.priceRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('价格规则不存在');
    return this.prisma.priceRule.update({ where: { id }, data: dto });
  }

  async findByVenue(venueId: string) {
    return this.prisma.priceRule.findMany({
      where: { venueId },
    });
  }
}
