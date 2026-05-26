import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '../config/config.service';
import { RecruitExpireProcessor } from './recruit-expire.processor';
import { RecruitExpireScheduler } from './recruit-expire.scheduler';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.redisUrl },
      }),
    }),
    BullModule.registerQueue({ name: 'recruit-expire' }),
  ],
  providers: [RecruitExpireProcessor, RecruitExpireScheduler],
})
export class JobsModule {}
