import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  // ActivitiesModule ให้ ActivitiesService มาใช้ดึงรายชื่อกิจกรรมที่เปิดรับสมัครอยู่ตอนนี้
  // (เป็น logic-only module ไม่มี controller — import ได้โดยไม่กระทบลำดับ route)
  imports: [ConfigModule, ActivitiesModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
