import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { Viewer } from '../events/event-visibility.util';

@ApiTags('Chatbot')
@Controller('api/chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * POST /api/chatbot/message - ถาม-ตอบกับผู้ช่วย (มาสคอต) — สาธารณะ ไม่ต้อง login
   * (ผู้เยี่ยมชมหน้าเว็บทั่วไปก็ถามได้) แต่จำกัดจำนวนครั้งต่อ IP ไว้ เพราะเรียก Gemini API
   * แต่ละครั้งมีต้นทุนโควตาจริง ต่างจาก endpoint อื่นที่ throttle เพื่อความปลอดภัยอย่างเดียว
   */
  @Post('message')
  @UseGuards(OptionalJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } }) // 15 ข้อความ/นาที ต่อ IP
  @ApiOperation({ summary: 'ส่งข้อความถามแชทบอท (Public)' })
  async sendMessage(@Body() dto: ChatMessageDto, @CurrentUser() viewer: Viewer | null) {
    const reply = await this.chatbotService.reply(dto.message, dto.history ?? [], viewer?.role ?? null);
    return { reply };
  }
}
