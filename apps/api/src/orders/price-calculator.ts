import { Injectable } from '@nestjs/common';
import { DateType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PriceCalculator {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(
    venueId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<number> {
    const rules = await this.prisma.priceRule.findMany({
      where: { venueId },
    });
    if (rules.length === 0) return 0;

    const dateType = this.getDateType(startAt);
    const slots = this.splitInto30MinSlots(startAt, endAt);

    let total = 0;
    for (const slot of slots) {
      const slotTime = this.timeToMinutes(slot);
      const matchedRule = rules.find(
        (r) =>
          r.dateType === dateType &&
          slotTime >= this.timeToMinutes(r.timeStart) &&
          slotTime < this.timeToMinutes(r.timeEnd),
      );
      if (matchedRule) {
        total += Number(matchedRule.pricePer30min);
      }
    }
    return total;
  }

  private getDateType(date: Date): DateType {
    const day = date.getUTCDay();
    if (day === 0 || day === 6) return 'WEEKEND';
    return 'WEEKDAY';
  }

  private splitInto30MinSlots(start: Date, end: Date): Date[] {
    const slots: Date[] = [];
    const current = new Date(start);
    while (current < end) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  }

  private timeToMinutes(timeOrDate: string | Date): number {
    if (typeof timeOrDate === 'string') {
      const [h, m] = timeOrDate.split(':').map(Number);
      return h * 60 + m;
    }
    return timeOrDate.getUTCHours() * 60 + timeOrDate.getUTCMinutes();
  }
}
