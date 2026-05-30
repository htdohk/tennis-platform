import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInternalOrderDto,
  CancelOrderRequestDto,
  QueryOrdersDto,
} from './dto/internal-order.dto';
import { ConfigService } from '../config/config.service';

@Controller('internal/orders')
@UseGuards(InternalAuthGuard)
export class InternalOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async createOrder(@Body() dto: CreateInternalOrderDto) {
    const user = await this.prisma.user.findFirst({
      where: { wechatId: dto.wechatId },
    });
    if (!user) {
      throw new NotFoundException(
        `未找到微信号为 ${dto.wechatId} 的用户，请先注册`,
      );
    }
    if (user.status === 'BANNED') {
      throw new BadRequestException('该用户已被封禁');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (
      startAt.getUTCMinutes() % 30 !== 0 ||
      endAt.getUTCMinutes() % 30 !== 0
    ) {
      throw new BadRequestException('时段必须是 30 分钟的整数倍');
    }
    if (startAt >= endAt) {
      throw new BadRequestException('开始时间必须早于结束时间');
    }

    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
      include: { venue: true },
    });
    if (!court || court.status === 'INACTIVE') {
      throw new BadRequestException('场地不可用');
    }

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

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const conflict = await tx.order.findFirst({
          where: {
            courtId: dto.courtId,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
            status: { in: ['PENDING_CONFIRM', 'CONFIRMED', 'RECRUITING'] },
          },
        });
        if (conflict) {
          throw new BadRequestException('所选时段已被预订');
        }

        return tx.order.create({
          data: {
            userId: user.id,
            courtId: dto.courtId,
            startAt,
            endAt,
            notes: dto.notes,
          },
          include: { court: { include: { venue: true } } },
        });
      });

      const publicBaseUrl = this.config.get('PUBLIC_WEB_BASE_URL');
      return {
        orderId: order.id,
        detailUrl: `${publicBaseUrl}/orders/${order.id}`,
        status: order.status,
      };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('所选时段已被预订');
    }
  }

  @Get()
  async queryUserOrders(@Query() query: QueryOrdersDto) {
    const user = await this.prisma.user.findFirst({
      where: { wechatId: query.wechatId },
    });
    if (!user) {
      throw new NotFoundException(`未找到微信号为 ${query.wechatId} 的用户`);
    }

    const whereClause: Record<string, unknown> = { userId: user.id };
    if (query.status) {
      whereClause.status = query.status;
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        court: { include: { venue: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      courtId: o.courtId,
      courtName: o.court.name,
      venueName: o.court.venue.name,
      startAt: o.startAt,
      endAt: o.endAt,
      status: o.status,
      type: o.type,
      totalPrice: o.totalPrice,
      paidStatus: o.paidStatus,
      notes: o.notes,
      createdAt: o.createdAt,
    }));
  }

  @Post(':id/cancel-request')
  async cancelOrderRequest(
    @Param('id') orderId: string,
    @Body() dto: CancelOrderRequestDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, nickname: true } } },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
      throw new BadRequestException('该订单无法取消');
    }

    // Don't actually cancel - just create audit log + notification for boss
    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorId: order.userId,
          action: 'CANCEL_REQUEST',
          target: `order:${orderId}`,
          payload: {
            reason: dto.reason,
            orderStatus: order.status,
            userName: order.user.nickname,
          },
        },
      });

      // Create notification for all admin/boss users
      const admins = await tx.user.findMany({
        where: { role: { in: ['BOSS', 'STAFF'] }, status: 'ACTIVE' },
        select: { id: true },
      });
      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: 'CANCEL_REQUEST',
            content: `用户 ${order.user.nickname} 申请取消订单 ${orderId}，原因：${dto.reason}`,
          },
        });
      }
    });

    return { notified: true };
  }
}
