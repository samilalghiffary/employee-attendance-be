export class MyAttendanceSummaryDataDto {
  /**
   * Total attendance records logged in the specified period
   * @example 31
   */
  totalRecords!: number;

  /**
   * Total days present (on-time and early departures)
   * @example 25
   */
  present!: number;

  /**
   * Total days arrived late
   * @example 4
   */
  late!: number;

  /**
   * Total days recorded as absent
   * @example 2
   */
  absent!: number;

  /**
   * Total accumulated late minutes
   * @example 115
   */
  lateMinutes!: number;

  /**
   * Total accumulated early leave minutes
   * @example 85
   */
  earlyLeaveMinutes!: number;

  /**
   * Punctuality rate percentage string
   * @example 86.2%
   */
  onTimeRate!: string;
}

export class MyAttendanceSummaryResponseDto {
  /**
   * Operation success indicator
   * @example true
   */
  success!: boolean;

  /**
   * Response message
   * @example Personal attendance summary retrieved successfully
   */
  message!: string;

  /**
   * Personal attendance summary data
   */
  data!: MyAttendanceSummaryDataDto;
}
