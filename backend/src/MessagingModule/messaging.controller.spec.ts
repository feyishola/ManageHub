import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessageThread } from './entities/message-thread.entity';
import { Message } from './entities/message.entity';

const mockService = () => ({
  startOrFindThread: jest.fn(),
  getUserThreads: jest.fn(),
  getThreadMessages: jest.fn(),
  sendMessage: jest.fn(),
  markAsRead: jest.fn(),
  softDeleteMessage: jest.fn(),
});

const authReq = (userId = 1) => ({ user: { id: userId } } as any);

describe('MessagingController', () => {
  let controller: MessagingController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    service = mockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [{ provide: MessagingService, useValue: service }],
    }).compile();

    controller = module.get<MessagingController>(MessagingController);
  });

  describe('startOrFindThread', () => {
    it('delegates to service.startOrFindThread', async () => {
      const thread = { id: 1, participantIds: [1, 2] } as MessageThread;
      service.startOrFindThread.mockResolvedValue(thread);

      const result = await controller.startOrFindThread(authReq(), {
        recipientId: 2,
      });

      expect(service.startOrFindThread).toHaveBeenCalledWith(1, {
        recipientId: 2,
      });
      expect(result).toEqual(thread);
    });
  });

  describe('getUserThreads', () => {
    it('delegates to service.getUserThreads', async () => {
      const threads = [{ id: 1 }] as MessageThread[];
      service.getUserThreads.mockResolvedValue(threads);

      const result = await controller.getUserThreads(authReq());

      expect(service.getUserThreads).toHaveBeenCalledWith(1);
      expect(result).toEqual(threads);
    });
  });

  describe('getMessages', () => {
    it('delegates with default pagination', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20 };
      service.getThreadMessages.mockResolvedValue(paginated);

      const result = await controller.getMessages(authReq(), 1);

      expect(service.getThreadMessages).toHaveBeenCalledWith(1, 1, {
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(paginated);
    });

    it('parses page and limit from query strings', async () => {
      service.getThreadMessages.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 10,
      });

      await controller.getMessages(authReq(), 1, '2', '10');

      expect(service.getThreadMessages).toHaveBeenCalledWith(1, 1, {
        page: 2,
        limit: 10,
      });
    });
  });

  describe('sendMessage', () => {
    it('delegates to service.sendMessage', async () => {
      const msg = { id: 5 } as Message;
      service.sendMessage.mockResolvedValue(msg);

      const result = await controller.sendMessage(authReq(), 1, {
        body: 'Hi there',
      });

      expect(service.sendMessage).toHaveBeenCalledWith(1, 1, {
        body: 'Hi there',
      });
      expect(result).toEqual(msg);
    });
  });

  describe('markAsRead', () => {
    it('delegates to service.markAsRead', async () => {
      const msg = { id: 5, isRead: true } as Message;
      service.markAsRead.mockResolvedValue(msg);

      const result = await controller.markAsRead(authReq(2), 1, 5);

      expect(service.markAsRead).toHaveBeenCalledWith(2, 1, 5);
      expect(result).toEqual(msg);
    });
  });

  describe('softDeleteMessage', () => {
    it('delegates to service.softDeleteMessage', async () => {
      service.softDeleteMessage.mockResolvedValue({ success: true });

      const result = await controller.softDeleteMessage(authReq(), 1, 5);

      expect(service.softDeleteMessage).toHaveBeenCalledWith(1, 1, 5);
      expect(result).toEqual({ success: true });
    });
  });
});
