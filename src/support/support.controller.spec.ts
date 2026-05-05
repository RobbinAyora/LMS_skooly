import { Test, TestingModule } from '@nestjs/testing';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';

describe('SupportController', () => {
  let controller: SupportController;
  let service: SupportService;

  const mockSupportService = {
    createTicket: jest.fn(),
    addMessage: jest.fn(),
    getMessages: jest.fn(),
    getUserTickets: jest.fn(),
    getAllTickets: jest.fn(),
    closeTicket: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: 'user-1',
      email: 'test@example.com',
      role: Role.STUDENT,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [
        { provide: SupportService, useValue: mockSupportService },
        { provide: JwtAuthGuard, useValue: {} },
        { provide: RolesGuard, useValue: {} },
        { provide: Roles, useValue: () => {} },
      ],
    }).compile();

    controller = module.get<SupportController>(SupportController);
    service = module.get<SupportService>(SupportService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTicket', () => {
    it('should create a ticket', async () => {
      const dto: CreateTicketDto = {
        subject: 'Test Subject',
        message: 'Test Message',
      };
      const result = {
        id: 'ticket-1',
        userId: 'user-1',
        subject: 'Test Subject',
        message: 'Test Message',
        status: 'OPEN',
        createdAt: new Date(),
      };
      mockSupportService.createTicket.mockResolvedValue(result);

      const output = await controller.createTicket(mockRequest, dto);

      expect(output).toEqual(result);
      expect(service.createTicket).toHaveBeenCalledWith(
        'user-1',
        Role.STUDENT,
        dto,
      );
    });
  });

  describe('sendMessage', () => {
    it('should send a message', async () => {
      const ticketId = 'ticket-1';
      const dto: SendMessageDto = {
        message: 'Test Message',
      };
      const result = {
        id: 'message-1',
        ticketId,
        senderId: 'user-1',
        senderRole: Role.STUDENT,
        message: 'Test Message',
        createdAt: new Date(),
      };
      mockSupportService.addMessage.mockResolvedValue(result);

      const output = await controller.sendMessage(ticketId, mockRequest, dto);

      expect(output).toEqual(result);
      expect(service.addMessage).toHaveBeenCalledWith(
        ticketId,
        'user-1',
        Role.STUDENT,
        dto,
      );
    });
  });

  describe('getMessages', () => {
    it('should get messages for a ticket', async () => {
      const ticketId = 'ticket-1';
      const result = [
        {
          id: 'message-1',
          ticketId,
          senderId: 'user-1',
          senderRole: Role.STUDENT,
          message: 'Test Message',
          createdAt: new Date(),
        },
      ];
      mockSupportService.getMessages.mockResolvedValue(result);

      const output = await controller.getMessages(ticketId);

      expect(output).toEqual(result);
      expect(service.getMessages).toHaveBeenCalledWith(ticketId);
    });
  });

  describe('getMyTickets', () => {
    it('should get tickets for the current user', async () => {
      const result = [
        {
          id: 'ticket-1',
          userId: 'user-1',
          subject: 'Test Subject',
          message: 'Test Message',
          status: 'OPEN',
          createdAt: new Date(),
          messages: [],
        },
      ];
      mockSupportService.getUserTickets.mockResolvedValue(result);

      const output = await controller.getMyTickets(mockRequest);

      expect(output).toEqual(result);
      expect(service.getUserTickets).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getAllTickets (admin)', () => {
    it('should get all tickets for admin', async () => {
      const mockAdminRequest = {
        user: {
          userId: 'admin-1',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
      };
      const result = [
        {
          id: 'ticket-1',
          userId: 'user-1',
          subject: 'Test Subject',
          message: 'Test Message',
          status: 'OPEN',
          createdAt: new Date(),
          messages: [],
        },
      ];
      mockSupportService.getAllTickets.mockResolvedValue(result);

      const output = await controller.getAllTickets();

      expect(output).toEqual(result);
      expect(service.getAllTickets).toHaveBeenCalled();
    });
  });

  describe('closeTicket (admin)', () => {
    it('should close a ticket for admin', async () => {
      const ticketId = 'ticket-1';
      const result = {
        id: ticketId,
        status: 'RESOLVED',
      };
      mockSupportService.closeTicket.mockResolvedValue(result);

      const output = await controller.closeTicket(ticketId);

      expect(output).toEqual(result);
      expect(service.closeTicket).toHaveBeenCalledWith(ticketId);
    });
  });
});
