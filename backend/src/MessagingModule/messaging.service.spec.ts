import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { MessagingService } from './messaging.service';
import { MessageThread } from './entities/message-thread.entity';
import { Message } from './entities/message.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeThread = (overrides: Partial<MessageThread> = {}): MessageThread =>
  ({
    id: 1,
    participantIds: [1, 2],
    lastMessageAt: null,
    createdAt: new Date('2024-01-01'),
    messages: [],
    ...overrides,
  } as MessageThread);

const makeMessage = (overrides: Partial<Message> = {}): Message =>
  ({
    id: 10,
    threadId: 1,
    senderId: 1,
    body: 'Hello',
    isRead: false,
    readAt: null,
    deletedBySender: false,
    deletedByRecipient: false,
    createdAt: new Date('2024-01-02'),
    ...overrides,
  } as Message);

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockQb = (result: any = null) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(result),
  getMany: jest.fn().mockResolvedValue(result ?? []),
  getManyAndCount: jest.fn().mockResolvedValue([result ?? [], 0]),
});

const mockThreadRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockMessageRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MessagingService', () => {
  let service: MessagingService;
  let threadRepo: ReturnType<typeof mockThreadRepo>;
  let messageRepo: ReturnType<typeof mockMessageRepo>;

  beforeEach(async () => {
    threadRepo = mockThreadRepo();
    messageRepo = mockMessageRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: getRepositoryToken(MessageThread), useValue: threadRepo },
        { provide: getRepositoryToken(Message), useValue: messageRepo },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  // ─── startOrFindThread ──────────────────────────────────────────────────

  describe('startOrFindThread', () => {
    it('throws BadRequestException if user tries to thread with themselves', async () => {
      await expect(
        service.startOrFindThread(1, { recipientId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing thread when one already exists', async () => {
      const thread = makeThread();
      const qb = mockQb(thread);
      threadRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.startOrFindThread(1, { recipientId: 2 });

      expect(result).toEqual(thread);
      expect(threadRepo.create).not.toHaveBeenCalled();
    });

    it('creates a new thread when none exists', async () => {
      const qb = mockQb(null);
      threadRepo.createQueryBuilder.mockReturnValue(qb);

      const newThread = makeThread({ participantIds: [1, 2] });
      threadRepo.create.mockReturnValue(newThread);
      threadRepo.save.mockResolvedValue(newThread);

      const result = await service.startOrFindThread(1, { recipientId: 2 });

      expect(threadRepo.create).toHaveBeenCalledWith({
        participantIds: [1, 2],
        lastMessageAt: null,
      });
      expect(result).toEqual(newThread);
    });

    it('sorts participantIds before storing', async () => {
      const qb = mockQb(null);
      threadRepo.createQueryBuilder.mockReturnValue(qb);
      const newThread = makeThread({ participantIds: [2, 5] });
      threadRepo.create.mockReturnValue(newThread);
      threadRepo.save.mockResolvedValue(newThread);

      await service.startOrFindThread(5, { recipientId: 2 });

      expect(threadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ participantIds: [2, 5] }),
      );
    });
  });

  // ─── getUserThreads ─────────────────────────────────────────────────────

  describe('getUserThreads', () => {
    it('returns threads sorted via query builder', async () => {
      const threads = [makeThread(), makeThread({ id: 2 })];
      const qb = mockQb(threads);
      qb.getMany.mockResolvedValue(threads);
      threadRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUserThreads(1);

      expect(result).toEqual(threads);
      expect(qb.orderBy).toHaveBeenCalledWith(
        'thread.lastMessageAt',
        'DESC',
        'NULLS LAST',
      );
    });
  });

  // ─── getThreadMessages ──────────────────────────────────────────────────

  describe('getThreadMessages', () => {
    beforeEach(() => {
      threadRepo.findOne.mockResolvedValue(makeThread());
    });

    it('throws NotFoundException if thread not found', async () => {
      threadRepo.findOne.mockResolvedValue(null);
      await expect(service.getThreadMessages(1, 99, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if user is not a participant', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread({ participantIds: [3, 4] }));
      await expect(service.getThreadMessages(1, 1, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns paginated messages', async () => {
      const messages = [makeMessage()];
      const qb = mockQb(null);
      qb.getManyAndCount.mockResolvedValue([messages, 1]);
      messageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getThreadMessages(1, 1, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual(messages);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('clamps limit to 100', async () => {
      const qb = mockQb(null);
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      messageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getThreadMessages(1, 1, { limit: 500 });

      expect(result.limit).toBe(100);
    });

    it('defaults page to 1', async () => {
      const qb = mockQb(null);
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      messageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getThreadMessages(1, 1, {});

      expect(result.page).toBe(1);
    });
  });

  // ─── sendMessage ────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    beforeEach(() => {
      threadRepo.findOne.mockResolvedValue(makeThread());
    });

    it('creates and saves message, updates thread lastMessageAt', async () => {
      const msg = makeMessage();
      messageRepo.create.mockReturnValue(msg);
      messageRepo.save.mockResolvedValue(msg);
      threadRepo.update.mockResolvedValue(undefined);

      const result = await service.sendMessage(1, 1, { body: 'Hello' });

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: 1, senderId: 1, body: 'Hello' }),
      );
      expect(threadRepo.update).toHaveBeenCalledWith(1, {
        lastMessageAt: msg.createdAt,
      });
      expect(result).toEqual(msg);
    });

    it('throws ForbiddenException if not a participant', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread({ participantIds: [3, 4] }));
      await expect(service.sendMessage(1, 1, { body: 'Hi' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── markAsRead ─────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    beforeEach(() => {
      threadRepo.findOne.mockResolvedValue(makeThread());
    });

    it('throws NotFoundException if message not found', async () => {
      messageRepo.findOne.mockResolvedValue(null);
      await expect(service.markAsRead(2, 1, 99)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if sender tries to mark own message', async () => {
      messageRepo.findOne.mockResolvedValue(makeMessage({ senderId: 1 }));
      await expect(service.markAsRead(1, 1, 10)).rejects.toThrow(ForbiddenException);
    });

    it('marks message as read when called by recipient', async () => {
      const msg = makeMessage({ senderId: 1 });
      messageRepo.findOne.mockResolvedValue(msg);
      const readMsg = { ...msg, isRead: true, readAt: new Date() };
      messageRepo.save.mockResolvedValue(readMsg);

      const result = await service.markAsRead(2, 1, 10);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('returns message unchanged if already read', async () => {
      const msg = makeMessage({ senderId: 1, isRead: true, readAt: new Date() });
      messageRepo.findOne.mockResolvedValue(msg);

      const result = await service.markAsRead(2, 1, 10);

      expect(messageRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual(msg);
    });
  });

  // ─── softDeleteMessage ──────────────────────────────────────────────────

  describe('softDeleteMessage', () => {
    beforeEach(() => {
      threadRepo.findOne.mockResolvedValue(makeThread());
    });

    it('throws NotFoundException if message not found', async () => {
      messageRepo.findOne.mockResolvedValue(null);
      await expect(service.softDeleteMessage(1, 1, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets deletedBySender=true when sender deletes', async () => {
      messageRepo.findOne.mockResolvedValue(makeMessage({ senderId: 1 }));
      messageRepo.update.mockResolvedValue(undefined);

      const result = await service.softDeleteMessage(1, 1, 10);

      expect(messageRepo.update).toHaveBeenCalledWith(10, {
        deletedBySender: true,
      });
      expect(result).toEqual({ success: true });
    });

    it('sets deletedByRecipient=true when recipient deletes', async () => {
      messageRepo.findOne.mockResolvedValue(makeMessage({ senderId: 1 }));
      messageRepo.update.mockResolvedValue(undefined);

      const result = await service.softDeleteMessage(2, 1, 10);

      expect(messageRepo.update).toHaveBeenCalledWith(10, {
        deletedByRecipient: true,
      });
      expect(result).toEqual({ success: true });
    });

    it('is idempotent if already deleted by sender', async () => {
      messageRepo.findOne.mockResolvedValue(
        makeMessage({ senderId: 1, deletedBySender: true }),
      );

      const result = await service.softDeleteMessage(1, 1, 10);

      expect(messageRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('is idempotent if already deleted by recipient', async () => {
      messageRepo.findOne.mockResolvedValue(
        makeMessage({ senderId: 1, deletedByRecipient: true }),
      );

      const result = await service.softDeleteMessage(2, 1, 10);

      expect(messageRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('throws ForbiddenException if not a participant', async () => {
      threadRepo.findOne.mockResolvedValue(makeThread({ participantIds: [3, 4] }));
      await expect(service.softDeleteMessage(1, 1, 10)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
