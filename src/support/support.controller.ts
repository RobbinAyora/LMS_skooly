import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';

interface RequestWithUser {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  async createTicket(
    @Request() req: RequestWithUser,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Post(':ticketId/messages')
  async sendMessage(
    @Param('ticketId') ticketId: string,
    @Request() req: RequestWithUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.supportService.addMessage(
      ticketId,
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Get(':ticketId/messages')
  async getMessages(@Param('ticketId') ticketId: string) {
    return this.supportService.getMessages(ticketId);
  }

  @Get('my-tickets')
  async getMyTickets(@Request() req: RequestWithUser) {
    return this.supportService.getUserTickets(req.user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAllTickets() {
    return this.supportService.getAllTickets();
  }

  @Patch(':id/close')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async closeTicket(@Param('id') id: string) {
    return this.supportService.closeTicket(id);
  }
}
