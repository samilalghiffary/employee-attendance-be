export class AttendanceSummaryMetricsDto {
  /**
   * Total number of registered employees
   * @example 25
   */
  totalEmployees!: number;

  /**
   * Total check-ins with on-time status
   * @example 20
   */
  totalPresent!: number;

  /**
   * Total check-ins with late status
   * @example 3
   */
  totalLate!: number;

  /**
   * Total records with leave status
   * @example 1
   */
  totalLeave!: number;

  /**
   * Overall attendance percentage
   * @example 92.0%
   */
  attendanceRate!: string;
}

export class AttendanceSummaryResponseDto {
  /**
   * Operation success indicator
   * @example true
   */
  success!: boolean;

  /**
   * Operation feedback message
   * @example Attendance summary retrieved successfully
   */
  message!: string;

  /**
   * Aggregated metrics summary
   */
  data!: AttendanceSummaryMetricsDto;
}
