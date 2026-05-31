import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { BindingService } from './binding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: { id: string; phone: string; role: string };
}

@Controller('api/binding')
export class BindingController {
  constructor(private readonly bindingService: BindingService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate-code')
  async generateCode(@Req() req: RequestWithUser) {
    return this.bindingService.generateBindCode(req.user.id);
  }
}
