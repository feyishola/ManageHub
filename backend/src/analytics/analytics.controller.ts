import { Controller, Post, Get, Body, Query, UseGuards, Ip } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Post('track')
    async track(@Body() dto: TrackEventDto, @Ip() ip: string) {
        dto.ipAddress = ip;
        return this.analyticsService.track(dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get('overview')
    async getOverview(@Query('from') from?: string, @Query('to') to?: string) {
        return this.analyticsService.getOverview(from, to);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get('events')
    async getEvents(@Query() query: AnalyticsQueryDto) {
        return this.analyticsService.getEvents(query);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get('retention')
    async getRetention() {
        return this.analyticsService.getRetention();
    }
}
