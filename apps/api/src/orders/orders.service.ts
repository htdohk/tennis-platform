import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PriceCalculator } from './price-calculator';
import { assertTransition } from './order-state-machine';
import { OrderStatus } from '@prisma/client';

function isAlignedTo30Min(date: Date): boolean {
  return (
    date.getUTCMinutes() % 30 === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priceCalc: PriceCalculator,
  ) {}

  /**
   * Get available 30-min slots for a court on a given date.
   * Returns each 30-min slot with an `available` boolean.
   */
  async getAvailability(courtId: string, date: string) {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: true },
    });
    if (!court) throw new NotFoundException('场地不存在');

    const venue = court.venue;
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);

    // Get active orders on this court for the date
    const orders = await this.prisma.order.findMany({
      where: {
        courtId,
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        status: { in: ['PENDING_CONFIRM', 'CONFIRMED', 'RECRUITING'] },
      },
    });

    // Get maintenance periods for the date
    const maintenances = await this.prisma.courtMaintenance.findMany({
      where: {
        courtId,
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
    });

    // Get business hours from venue
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

    // Generate all 30-min slots for the business day
    const slots: { time: string; available: boolean; reason?: string }[] = [];
    const [openH, openM] = hours.open.split(':').map(Number);
    const [closeH, closeM] = hours.close.split(':').map(Number);

    const current = new Date(Date.UTC(2026, 0, 1, openH, openM, 0));
    const close = new Date(Date.UTC(2026, 0, 1, closeH, closeM, 0));

    while (current < close) {
      const slotStart = `${String(current.getUTCHours()).padStart(2, '0')}:${String(current.getUTCMinutes()).padStart(2, '0')}`;
      const slotEndDate = new Date(current);
      slotEndDate.setUTCMinutes(slotEndDate.getUTCMinutes() + 30);

      const slotStartFull = new Date(`${date}T${slotStart}:00Z`);

      // Check maintenance
      const inMaintenance = maintenances.some(
        (m) => slotStartFull >= m.startAt && slotStartFull < m.endAt,
      );

      // Check order conflict
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

      slots.push({ time: slotStart, available, ...(reason ? { reason } : {}) });

      current.setUTCMinutes(current.getUTCMinutes() + 30);
    }

    return slots;
  }

  /**
   * Create a booking order with Prisma transaction + conflict detection.
   */
  async create(userId: string, dto: CreateOrderDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    // Time alignment check
    if (!isAlignedTo30Min(startAt) || !isAlignedTo30Min(endAt)) {
      throw new BadRequestException('时段必须是 30 分钟的整数倍');
    }

    if (startAt >= endAt) {
      throw new BadRequestException('开始时间必须早于结束时间');
    }

    // Get court + venue
    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
      include: { venue: true },
    });
    if (!court || court.status === 'INACTIVE') {
      throw new BadRequestException('场地不可用');
    }

    // Check maintenance conflict
    const maintenanceConflict = await this.prisma.courtMaintenance.findFirst({
      where: {
        courtId: dto.courtId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (maintenanceConflict) {
      throw new BadRequestException('所选时段与场地维护期冲突');
    }

    // Calculate price
    const totalPrice = await this.priceCalc.calculate(
      court.venueId,
      startAt,
      endAt,
    );

    // Create order with transaction for conflict detection
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        // Check for active order conflict inside transaction
        const conflict = await tx.order.findFirst({
          where: {
            courtId: dto.courtId,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
            status: { in: ['PENDING_CONFIRM', 'CONFIRMED', 'RECRUITING'] },
          },
        });
        if (conflict) {
          throw new ConflictException('所选时段已被预订');
        }

        return tx.order.create({
          data: {
            userId,
            courtId: dto.courtId,
            startAt,
            endAt,
            totalPrice,
            notes: dto.notes,
          },
          include: { court: { include: { venue: true } } },
        });
      });

      return order;
    } catch (e) {
      // Re-throw ConflictException from transaction
      if (e instanceof ConflictException) throw e;
      // If it's a unique constraint violation (race condition), return 409
      throw new ConflictException('所选时段已被预订');
    }
  }

  async findMine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { court: { include: { venue: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { court: { include: { venue: true } }, user: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  async findAll(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { status: status as OrderStatus } : undefined,
      include: { court: { include: { venue: true } }, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async transition(orderId: string, toStatus: OrderStatus) {
    const order = await this.findById(orderId);
    assertTransition(order.status, toStatus);

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: toStatus },
    });
  }

  async markPaid(orderId: string) {
    await this.findById(orderId);
    return this.prisma.order.update({
      where: { id: orderId },
      data: { paidStatus: 'PAID' },
    });
  }

  async createByAdmin(dto: CreateOrderDto & { userId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const conflict = await tx.order.findFirst({
        where: {
          courtId: dto.courtId,
          startAt: { lt: new Date(dto.endAt) },
          endAt: { gt: new Date(dto.startAt) },
          status: { in: ['PENDING_CONFIRM', 'CONFIRMED', 'RECRUITING'] },
        },
      });
      if (conflict) {
        throw new ConflictException('所选时段已被预订');
      }

      return tx.order.create({
        data: {
          userId: dto.userId,
          courtId: dto.courtId,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          status: 'CONFIRMED',
          notes: dto.notes,
        },
        include: { court: { include: { venue: true } }, user: true },
      });
    });
  }

  /**
   * Get all orders for schedule board within a date range.
   * Returns orders with court, user, and recruitPost info.
   */
  async getSchedule(from: string, to: string) {
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T23:59:59Z`);

    const orders = await this.prisma.order.findMany({
      where: {
        startAt: { gte: fromDate },
        endAt: { lte: toDate },
      },
      include: {
        court: { include: { venue: true } },
        user: {
          select: {
            id: true,
            nickname: true,
            phone: true,
            level: true,
            wechatId: true,
          },
        },
        recruitPost: true,
      },
      orderBy: [{ startAt: 'asc' }, { court: { code: 'asc' } }],
    });

    return orders;
  }
}
