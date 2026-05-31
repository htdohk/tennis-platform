import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { BindingService } from './binding.service';
import { InternalAuthGuard } from '../internal/internal-auth.guard';

@Controller('internal/binding')
@UseGuards(InternalAuthGuard)
export class InternalBindingController {
  constructor(private readonly bindingService: BindingService) {}

  @Post('verify')
  async verify(
    @Body() body: { code: string; hermesId: string; groupId?: string },
  ) {
    return this.bindingService.verifyAndBind(body.code, body.hermesId, body.groupId);
  }

  @Get('user')
  async getUser(
    @Query('hermesId') hermesId: string,
    @Query('groupId') groupId?: string,
  ) {
    if (!hermesId) return null;
    return this.bindingService.getUserByHermesId(hermesId, groupId);
  }

  @Post('manual')
  async manualBind(
    @Body() body: { userId: string; hermesId: string; groupId?: string },
  ) {
    await this.bindingService.manualBind(body.userId, body.hermesId, body.groupId);
    return { success: true };
  }
}
