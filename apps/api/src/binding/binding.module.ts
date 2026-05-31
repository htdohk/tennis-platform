import { Module } from '@nestjs/common';
import { BindingService } from './binding.service';
import { BindingController } from './binding.controller';
import { InternalBindingController } from './internal-binding.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BindingController, InternalBindingController],
  providers: [BindingService],
  exports: [BindingService],
})
export class BindingModule {}
