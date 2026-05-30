import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyBossDto } from './dto/internal-notify.dto';

@Controller('internal/notify')
@UseGuards(InternalAuthGuard)
export class InternalNotifyController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async notifyBoss(@Body() dto: NotifyBossDto) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['BOSS', 'STAFF'] }, status: 'ACTIVE' },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          action: 'MCP_NOTIFY_BOSS',
          target: dto.orderId ? `order:${dto.orderId}` : 'system',
          payload: {
            message: dto.message,
            orderId: dto.orderId,
            context: dto.context,
          },
        },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: 'MCP_NOTIFY',
            content: dto.orderId
              ? `[MCP通知] ${dto.message}（关联订单：${dto.orderId}）`
              : `[MCP通知] ${dto.message}`,
          },
        });
      }
    });

    return { notified: true };
  }
}
