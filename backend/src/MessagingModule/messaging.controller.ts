import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { StartThreadDto } from './dto/start-thread.dto';
import { CreateMessageDto } from './dto/create-message.dto';

/**
 * Minimal JWT guard interface — replace with your actual guard & user decorator.
 * The controller expects `req.user.id` to be the authenticated user's ID.
 */
import { Request } from 'express';

interface AuthRequest extends Request {
  user: { id: number };
}

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ─── Threads ─────────────────────────────────────────────────────────────

  @Post('threads')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or find an existing thread with a user' })
  @ApiResponse({ status: 200, description: 'Thread returned or created.' })
  startOrFindThread(@Req() req: AuthRequest, @Body() dto: StartThreadDto) {
    return this.messagingService.startOrFindThread(req.user.id, dto);
  }

  @Get('threads')
  @ApiOperation({ summary: 'List all threads for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Array of threads sorted by lastMessageAt.' })
  getUserThreads(@Req() req: AuthRequest) {
    return this.messagingService.getUserThreads(req.user.id);
  }

  // ─── Messages ────────────────────────────────────────────────────────────

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Get paginated message history for a thread' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMessages(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) threadId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getThreadMessages(req.user.id, threadId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('threads/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message in a thread' })
  @ApiParam({ name: 'id', type: Number })
  sendMessage(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) threadId: number,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagingService.sendMessage(req.user.id, threadId, dto);
  }

  @Patch('threads/:id/messages/:msgId/read')
  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'msgId', type: Number })
  markAsRead(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) threadId: number,
    @Param('msgId', ParseIntPipe) messageId: number,
  ) {
    return this.messagingService.markAsRead(req.user.id, threadId, messageId);
  }

  @Delete('threads/:id/messages/:msgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a message for your side only' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'msgId', type: Number })
  softDeleteMessage(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) threadId: number,
    @Param('msgId', ParseIntPipe) messageId: number,
  ) {
    return this.messagingService.softDeleteMessage(req.user.id, threadId, messageId);
  }
}
