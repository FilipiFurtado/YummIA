import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';

import { ChatDto } from './dto/chat.dto.js';
import { AssistantService } from './assistant.service.js';
import { AssistantCartProposalsService } from './assistant-cart-proposals.service.js';

@ApiTags('Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly proposalsService: AssistantCartProposalsService,
  ) {}

  @Post('chat')
  chat(@Req() req: AuthenticatedRequest, @Body() dto: ChatDto) {
    return this.assistantService.chat(
      req.user.id,
      dto.message,
      dto.conversationId,
    );
  }

  @Get('conversations/:id')
  getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.assistantService.getConversation(req.user.id, id);
  }

  @Post('proposals/:id/confirm')
  confirmProposal(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.proposalsService.confirm(req.user.id, id);
  }
}
