import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, userRole: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        message: dto.message || '',
        status: TicketStatus.OPEN,
      },
    });

    // Create initial message if provided
    if (dto.message && dto.message.trim()) {
      await this.prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: userId,
          senderRole: userRole,
          message: dto.message.trim(),
        },
      });
    }

    return ticket;
  }

  async addMessage(
    ticketId: string,
    senderId: string,
    senderRole: string,
    dto: SendMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId,
        senderRole,
        message: dto.message,
      },
    });
  }

  async getMessages(ticketId: string) {
    return this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getUserTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async getAllTickets() {
    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async closeTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: { status: TicketStatus.RESOLVED },
    });
  }
}
