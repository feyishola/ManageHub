import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageThread } from './entities/message-thread.entity';
import { Message } from './entities/message.entity';
import { StartThreadDto } from './dto/start-thread.dto';
import { CreateMessageDto } from './dto/create-message.dto';

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessageThread)
    private readonly threadRepo: Repository<MessageThread>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  /**
   * Start or find existing thread between two users.
   * Prevents a user from threading with themselves.
   */
  async startOrFindThread(
    currentUserId: number,
    dto: StartThreadDto,
  ): Promise<MessageThread> {
    if (currentUserId === dto.recipientId) {
      throw new BadRequestException('Cannot start a thread with yourself.');
    }

    const participants = [currentUserId, dto.recipientId].sort((a, b) => a - b);

    // Look for an existing thread with exactly these two participants
    const existing = await this.threadRepo
      .createQueryBuilder('thread')
      .where(':p1 = ANY(thread.participantIds)', { p1: participants[0] })
      .andWhere(':p2 = ANY(thread.participantIds)', { p2: participants[1] })
      .getOne();

    if (existing) {
      return existing;
    }

    const thread = this.threadRepo.create({
      participantIds: participants,
      lastMessageAt: null,
    });

    return this.threadRepo.save(thread);
  }

  /**
   * List all threads for a user, sorted by lastMessageAt desc, then createdAt desc.
   */
  async getUserThreads(userId: number): Promise<MessageThread[]> {
    return this.threadRepo
      .createQueryBuilder('thread')
      .where(':userId = ANY(thread.participantIds)', { userId })
      .orderBy('thread.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('thread.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get paginated messages for a thread visible to the requesting user.
   * Each side's soft-deleted messages are hidden from that user only.
   */
  async getThreadMessages(
    userId: number,
    threadId: number,
    query: PaginationQuery,
  ): Promise<{ data: Message[]; total: number; page: number; limit: number }> {
    await this.ensureParticipant(userId, threadId);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.threadId = :threadId', { threadId })
      .andWhere(
        `NOT (msg.senderId = :userId AND msg.deletedBySender = true)`,
        { userId },
      )
      .andWhere(
        `NOT (msg.senderId != :userId AND msg.deletedByRecipient = true)`,
        { userId },
      )
      .orderBy('msg.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Send a message to a thread.
   */
  async sendMessage(
    senderId: number,
    threadId: number,
    dto: CreateMessageDto,
  ): Promise<Message> {
    await this.ensureParticipant(senderId, threadId);

    const message = this.messageRepo.create({
      threadId,
      senderId,
      body: dto.body,
      isRead: false,
      readAt: null,
      deletedBySender: false,
      deletedByRecipient: false,
    });

    const saved = await this.messageRepo.save(message);

    // Update thread's lastMessageAt
    await this.threadRepo.update(threadId, { lastMessageAt: saved.createdAt });

    return saved;
  }

  /**
   * Mark a message as read. Only the non-sender (recipient) can mark as read.
   */
  async markAsRead(
    userId: number,
    threadId: number,
    messageId: number,
  ): Promise<Message> {
    await this.ensureParticipant(userId, threadId);

    const message = await this.messageRepo.findOne({
      where: { id: messageId, threadId },
    });

    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found.`);
    }

    if (message.senderId === userId) {
      throw new ForbiddenException('Sender cannot mark their own message as read.');
    }

    if (message.isRead) {
      return message;
    }

    message.isRead = true;
    message.readAt = new Date();

    return this.messageRepo.save(message);
  }

  /**
   * Soft-delete a message for the requesting user's side only.
   */
  async softDeleteMessage(
    userId: number,
    threadId: number,
    messageId: number,
  ): Promise<{ success: boolean }> {
    await this.ensureParticipant(userId, threadId);

    const message = await this.messageRepo.findOne({
      where: { id: messageId, threadId },
    });

    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found.`);
    }

    if (message.senderId === userId) {
      // Sender deletes their copy
      if (message.deletedBySender) {
        return { success: true };
      }
      await this.messageRepo.update(messageId, { deletedBySender: true });
    } else {
      // Recipient deletes their copy
      if (message.deletedByRecipient) {
        return { success: true };
      }
      await this.messageRepo.update(messageId, { deletedByRecipient: true });
    }

    return { success: true };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async findThreadOrFail(threadId: number): Promise<MessageThread> {
    const thread = await this.threadRepo.findOne({ where: { id: threadId } });
    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} not found.`);
    }
    return thread;
  }

  async ensureParticipant(userId: number, threadId: number): Promise<MessageThread> {
    const thread = await this.findThreadOrFail(threadId);
    if (!thread.participantIds.includes(userId)) {
      throw new ForbiddenException('You are not a participant of this thread.');
    }
    return thread;
  }
}
