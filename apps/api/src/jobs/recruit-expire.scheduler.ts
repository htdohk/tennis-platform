import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class RecruitExpireScheduler implements OnModuleInit {
  private readonly logger = new Logger(RecruitExpireScheduler.name);

  constructor(@InjectQueue('recruit-expire') private readonly queue: Queue) {}

  async onModuleInit() {
    // Remove existing repeatable jobs to avoid duplicates on restart
    const repeatable = await this.queue.getRepeatableJobs();
    for (const item of repeatable) {
      await this.queue.removeRepeatableByKey(item.key);
    }

    // Schedule every 60 seconds
    await this.queue.add(
      'scan-expired',
      {},
      {
        repeat: { pattern: '*/60 * * * * *' },
        removeOnComplete: true,
      },
    );

    this.logger.log('Recruit expire scanner scheduled (every 60s)');
  }
}
