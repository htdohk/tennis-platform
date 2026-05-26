import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RecruitsService } from './recruits.service';
import { PreviewMatchesDto, CreateRecruitDto } from './dto/recruit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser {
  user: { id: string; phone: string; role: string };
}

@Controller('api/recruits')
export class RecruitsController {
  constructor(private readonly recruitsService: RecruitsService) {}

  @Post('preview-matches')
  previewMatches(@Body() dto: PreviewMatchesDto) {
    return this.recruitsService.previewMatches(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateRecruitDto) {
    return this.recruitsService.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('minLevel') minLevel?: string,
    @Query('maxLevel') maxLevel?: string,
  ) {
    return this.recruitsService.findAll(
      date,
      minLevel ? Number(minLevel) : undefined,
      maxLevel ? Number(maxLevel) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recruitsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  join(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.recruitsService.join(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/leave')
  leave(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.recruitsService.leave(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/convert-to-normal')
  convertToNormal(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.recruitsService.convertToNormal(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/abandon')
  abandon(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.recruitsService.abandon(id, req.user.id);
  }
}
