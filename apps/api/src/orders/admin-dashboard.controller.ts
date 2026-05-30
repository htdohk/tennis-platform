import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';

interface DayUtilization {
  date: string;
  totalSlots: number;
  bookedSlots: number;
  cancelledCount: number;
  utilizationRate: number;
}

interface VenueUtilization {
  venueId: string;
  venueName: string;
  days: DayUtilization[];
}

@Controller('admin/dashboard')
@UseGuards(AdminGuard)
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('utilization')
  async getUtilization(
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<{ venues: VenueUtilization[] }> {
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T23:59:59Z`);

    const venues = await this.prisma.venue.findMany({
      where: { status: 'ACTIVE' },
      include: { courts: { where: { status: { not: 'INACTIVE' } } } },
      orderBy: { name: 'asc' },
    });

    const results: VenueUtilization[] = [];

    for (const venue of venues) {
      const days: DayUtilization[] = [];
      const current = new Date(fromDate);

      while (current <= toDate) {
        const dateStr = current.toISOString().split('T')[0];
        const dayStart = new Date(`${dateStr}T00:00:00Z`);
        const dayEnd = new Date(`${dateStr}T23:59:59Z`);

        // Calculate business slots for this venue on this day
        const businessHours = venue.defaultBusinessHours as Record<
          string,
          { open: string; close: string }
        > | null;
        const dayOfWeek = current.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const hoursKey = isWeekend ? 'weekend' : 'weekday';
        const hours = businessHours?.[hoursKey] || {
          open: '07:00',
          close: '22:00',
        };

        const [openH, openM] = hours.open.split(':').map(Number);
        const [closeH, closeM] = hours.close.split(':').map(Number);
        const totalMinutes = (closeH - openH) * 60 + (closeM - openM);
        const totalSlots = Math.floor(totalMinutes / 30);

        // Get orders for this venue's courts on this day
        const courtIds = venue.courts.map((c) => c.id);
        const orders = await this.prisma.order.findMany({
          where: {
            courtId: { in: courtIds },
            startAt: { lt: dayEnd },
            endAt: { gt: dayStart },
          },
          select: { status: true, startAt: true, endAt: true },
        });

        // Count booked 30-min slots (each order covers multiple slots)
        let bookedSlots = 0;
        for (const order of orders) {
          if (order.status === 'CANCELLED' || order.status === 'RECRUITING_EXPIRED') continue;
          const orderStart = order.startAt > dayStart ? order.startAt : dayStart;
          const orderEnd = order.endAt < dayEnd ? order.endAt : dayEnd;
          const orderMinutes =
            (orderEnd.getUTCHours() - orderStart.getUTCHours()) * 60 +
            (orderEnd.getUTCMinutes() - orderStart.getUTCMinutes());
          bookedSlots += Math.floor(orderMinutes / 30);
        }

        const cancelledCount = orders.filter(
          (o) => o.status === 'CANCELLED',
        ).length;

        const maxBookableSlots = totalSlots * courtIds.length || totalSlots;
        const utilizationRate =
          maxBookableSlots > 0
            ? Math.round((bookedSlots / maxBookableSlots) * 100) / 100
            : 0;

        days.push({
          date: dateStr,
          totalSlots: maxBookableSlots,
          bookedSlots,
          cancelledCount,
          utilizationRate,
        });

        current.setUTCDate(current.getUTCDate() + 1);
      }

      results.push({ venueId: venue.id, venueName: venue.name, days });
    }

    return { venues: results };
  }
}
