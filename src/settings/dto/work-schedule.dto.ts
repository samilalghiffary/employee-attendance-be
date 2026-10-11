import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class UpdateWorkScheduleDto {
  /**
   * Work start time in 24-hour format (HH:mm)
   * @example 08:00
   */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'workStartTime must be in valid 24-hour format (HH:mm)',
  })
  workStartTime?: string;

  /**
   * Work end time in 24-hour format (HH:mm)
   * @example 17:00
   */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'workEndTime must be in valid 24-hour format (HH:mm)',
  })
  workEndTime?: string;

  /**
   * Grace period tolerance for late check-in in minutes
   * @example 15
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  lateToleranceMinutes?: number;
}

export class WorkScheduleDataDto {
  /**
   * Work start time in 24-hour format (HH:mm)
   * @example 08:00
   */
  workStartTime!: string;

  /**
   * Work end time in 24-hour format (HH:mm)
   * @example 17:00
   */
  workEndTime!: string;

  /**
   * Grace period tolerance for late check-in in minutes
   * @example 15
   */
  lateToleranceMinutes!: number;

  /**
   * Last configuration update timestamp
   * @example 2026-10-11T16:45:00.000Z
   */
  updatedAt!: string;
}

export class WorkScheduleResponseDto {
  /**
   * Operation success indicator
   * @example true
   */
  success!: boolean;

  /**
   * Operation feedback message
   * @example Work schedule configuration retrieved successfully
   */
  message?: string;

  /**
   * Work schedule configuration data
   */
  data!: WorkScheduleDataDto;
}
