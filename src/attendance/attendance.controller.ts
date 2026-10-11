import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ApiDoc } from '../common/decorators/api-doc.decorator.js';
import { AttendanceService } from './attendance.service.js';
import {
  AttendanceResponseDto,
  PaginatedAttendanceResponseDto,
  TodayAttendanceResponseDto,
} from './dto/attendance-response.dto.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { CheckOutDto } from './dto/check-out.dto.js';
import { QueryAttendanceDto } from './dto/query-attendance.dto.js';

@ApiTags('Attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiDoc({
    summary: 'Daily attendance check-in',
    description:
      'Records check-in timestamp for today. Automatically marks status as PRESENT if before 09:00 or LATE if after.',
    status: HttpStatus.CREATED,
    responseType: AttendanceResponseDto,
    responseDescription: 'Check-in recorded successfully',
    isAuth: true,
  })
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckInDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.checkIn(user.id, dto);
  }

  @Post('check-out')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Daily attendance check-out',
    description:
      'Records check-out timestamp for today. Requires prior check-in for the current day.',
    status: HttpStatus.OK,
    responseType: AttendanceResponseDto,
    responseDescription: 'Check-out recorded successfully',
    isAuth: true,
  })
  async checkOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckOutDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.checkOut(user.id, dto);
  }

  @Get('today')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: "Today's attendance status",
    description:
      'Retrieves the attendance status for the active user for today (hasCheckedIn, hasCheckedOut).',
    status: HttpStatus.OK,
    responseType: TodayAttendanceResponseDto,
    responseDescription: "Today's attendance status retrieved successfully",
    isAuth: true,
  })
  async getTodayStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TodayAttendanceResponseDto> {
    return this.attendanceService.getTodayStatus(user.id);
  }

  @Get('my-history')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Personal attendance history',
    description:
      'Retrieves attendance history for the currently logged-in employee with date range filter and pagination.',
    status: HttpStatus.OK,
    responseType: PaginatedAttendanceResponseDto,
    responseDescription: 'Attendance history retrieved successfully',
    isAuth: true,
  })
  async getMyHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    return this.attendanceService.getMyHistory(user.id, query);
  }
}
