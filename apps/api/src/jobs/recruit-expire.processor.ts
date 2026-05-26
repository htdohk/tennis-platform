import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Processor('recruit-expire')
export class RecruitExpireProcessor extends WorkerHost {
  private readonly logger = new Logger(RecruitExpireProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.log(`Scanning for expired recruit posts... (job ${_job.id})`);

    const expiredPosts = await this.prisma.recruitPost.findMany({
      where: {
        status: 'RECRUITING',
        deadline: { lt: new Date() },
      },
      include: { order: true },
    });

    for (const post of expiredPosts) {
      await this.prisma.$transaction(async (tx) => {
        // Update RecruitPost and Order status
        await tx.recruitPost.update({
          where: { id: post.id },
          data: { status: 'RECRUITING_EXPIRED' },
        });

        await tx.order.update({
          where: { id: post.orderId },
          data: { status: 'RECRUITING_EXPIRED' },
        });

        // Write AuditLog
        await tx.auditLog.create({
          data: {
            action: 'RECRUIT_EXPIRED',
            target: `recruit_post:${post.id}`,
            payload: {
              orderId: post.orderId,
              deadline: post.deadline,
              expiredAt: new Date().toISOString(),
            },
          },
        });

        // Create notification for the order creator
        await tx.notification.create({
          data: {
            userId: post.order.userId,
            type: 'RECRUIT_EXPIRED',
            content: `你的招募局已到期未凑齐人数(目标段位 ${String(post.targetLevel)} ± ${String(post.levelTolerance)})。你可以选择转为包场订单或放弃。`,
          },
        });
      });

      this.logger.log(`Expired recruit: ${post.id}`);
    }

    this.logger.log(`Expired ${expiredPosts.length} recruit posts`);
  }
}
