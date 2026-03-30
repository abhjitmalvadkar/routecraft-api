import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { StartConversationDto } from './dto/start-conversation.dto';
import { AnswerPromptDto } from './dto/answer-prompt.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../entities/enums';


@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AGENT, Role.ORG_ADMIN, Role.SUPER_ADMIN)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('start')
  async startConversation(
    @CurrentUser() user: any,
    @Body() dto: StartConversationDto,
  ) {
    // For agent/org admin, use orgId from JWT; for super admin, use from body
    const orgId = user.orgId || dto.orgId;
    return this.aiService.startConversation(orgId, dto.message);
  }

  @Post('continue')
  async continueConversation(
    @CurrentUser() user: any,
    @Body() dto: AnswerPromptDto,
  ) {
    const orgId = user.orgId || dto.orgId;
    return this.aiService.continueConversation(
      orgId,
      dto.conversationHistory,
      dto.answer,
    );
  }
}
