import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { AssistantToolsService } from './assistant-tools.service.js';
import { AssistantSemanticService } from './assistant-semantic.service.js';
import { AssistantCartProposalsService } from './assistant-cart-proposals.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    AssistantToolsService,
    AssistantSemanticService,
    AssistantCartProposalsService,
  ],
})
export class AssistantModule {}
