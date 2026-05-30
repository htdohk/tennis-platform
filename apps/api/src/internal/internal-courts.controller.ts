import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('internal/courts')
@UseGuards(InternalAuthGuard)
export class InternalCourtsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async queryCourts() {
    const courts = await this.prisma.court.findMany({
      include: { venue: { select: { name: true } } },
      orderBy: { code: 'asc' },
    });
    return courts.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      surface: c.surface,
      status: c.status,
      venueName: c.venue.name,
    }));
  }

  @Get('availability')
  async queryAvailableSlots(
    @Query('date') date: string,
    @Query('courtId') courtId?: string,
  ) {
    const courts = courtId
      ? await this.prisma.court.findMany({
          where: { id: courtId },
          include: { venue: true },
        })
      : await this.prisma.court.findMany({
          include: { venue: true },
          orderBy: { code: 'asc' },
        });

    if (!courts.length) return [];

    const results: {
      courtId: string;
      courtName: string;
      time: string;
      available: boolean;
      reason?: string;
    }[] = [];

    for (const court of courts) {
      const venue = court.venue;
      const dayStart = new Date(`${date}T00:00:00Z`);
      const dayEnd = new Date(`${date}T23:59:59Z`);

      const orders = await this.prisma.order.findMany({
        where: {
          courtId: court.id,
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
          status: { in: ['PENDING_CONFIRM', 'CONFIRMED', 'RECRUITING'] },
        },
      });

      const maintenances = await this.prisma.courtMaintenance.findMany({
        where: {
          courtId: court.id,
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
      });

      const businessHours = venue.defaultBusinessHours as Record<
        string,
        { open: string; close: string }
      > | null;
      const dayOfWeek = new Date(date).getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const hoursKey = isWeekend ? 'weekend' : 'weekday';
      const hours = businessHours?.[hoursKey] || {
        open: '07:00',
        close: '22:00',
      };

      const [openH, openM] = hours.open.split(':').map(Number);
      const [closeH, closeM] = hours.close.split(':').map(Number);

      const current = new Date(Date.UTC(2026, 0, 1, openH, openM, 0));
      const close = new Date(Date.UTC(2026, 0, 1, closeH, closeM, 0));

      while (current < close) {
        const slotStart = `${String(current.getUTCHours()).padStart(2, '0')}:${String(current.getUTCMinutes()).padStart(2, '0')}`;
        const slotStartFull = new Date(`${date}T${slotStart}:00Z`);

        const inMaintenance = maintenances.some(
          (m) => slotStartFull >= m.startAt && slotStartFull < m.endAt,
        );
        const isBooked = orders.some(
          (o) => slotStartFull >= o.startAt && slotStartFull < o.endAt,
        );

        let available = true;
        let reason: string | undefined;

        if (inMaintenance) {
          available = false;
          reason = '维护期';
        } else if (isBooked) {
          available = false;
          reason = '已预订';
        }

        results.push({
          courtId: court.id,
          courtName: court.name,
          time: slotStart,
          available,
          ...(reason ? { reason } : {}),
        });

        current.setUTCMinutes(current.getUTCMinutes() + 30);
      }
    }

    return results;
  }
}
