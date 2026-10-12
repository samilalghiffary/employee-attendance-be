import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ApiDoc } from '../common/decorators/api-doc.decorator.js';
import { UserRole } from '../common/enums/role.enum.js';
import { AttendanceService } from './attendance.service.js';
import { PaginatedAttendanceResponseDto } from './dto/attendance-response.dto.js';
import { AttendanceSummaryResponseDto } from './dto/attendance-summary.dto.js';
import { QueryAttendanceSummaryDto } from './dto/query-attendance-summary.dto.js';
import { QueryAdminAttendanceDto } from './dto/query-attendance.dto.js';

@ApiTags('Admin Attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/attendance')
export class AttendanceAdminController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Overview of all employees attendance (Admin)',
    description:
      'Admin-only endpoint to monitor attendance records across all employees with filters for user, status, date range, and pagination.',
    status: HttpStatus.OK,
    responseType: PaginatedAttendanceResponseDto,
    responseDescription: 'Attendance overview records retrieved successfully',
    isAuth: true,
  })
  async getAdminOverview(
    @Query() query: QueryAdminAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    return this.attendanceService.getAdminOverview(query);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Get attendance metrics summary (Admin)',
    description:
      'Aggregates attendance metrics including total present, late, absent, and overall attendance rate.',
    status: HttpStatus.OK,
    responseType: AttendanceSummaryResponseDto,
    responseDescription: 'Summary metrics retrieved successfully',
    isAuth: true,
  })
  async getSummary(
    @Query() query: QueryAttendanceSummaryDto,
  ): Promise<AttendanceSummaryResponseDto> {
    return this.attendanceService.getSummary(query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Delete attendance record (Admin)',
    description:
      'Permanently deletes a specific attendance log record by its ID.',
    status: HttpStatus.OK,
    responseDescription: 'Attendance record deleted successfully',
    isAuth: true,
  })
  async deleteAttendance(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.attendanceService.deleteAttendance(id);
  }
}
