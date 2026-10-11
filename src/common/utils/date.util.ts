/**
 * Date and time manipulation utilities configured for local work timezone (Asia/Jakarta, UTC+7).
 */
export const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Formats a Date instance to a YYYY-MM-DD date string.
 */
export function getLocalDateString(
  date = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Parses a HH:mm string into numeric hour and minute.
 */
export function parseTimeString(timeStr: string): {
  hour: number;
  minute: number;
} {
  const [hStr, mStr] = timeStr.split(':');
  return {
    hour: parseInt(hStr ?? '0', 10),
    minute: parseInt(mStr ?? '0', 10),
  };
}

/**
 * Calculates late arrival minutes and whether the check-in is considered late
 * after taking lateToleranceMinutes (grace period) into account.
 *
 * Example:
 * workStartTime = "08:00", lateToleranceMinutes = 15
 * Check-in 08:14 -> isLate: false, lateMinutes: 0
 * Check-in 08:16 -> isLate: true, lateMinutes: 16
 */
export function calculateLateArrival(
  checkInDate: Date,
  workStartTime: string,
  lateToleranceMinutes: number = 0,
  timeZone = DEFAULT_TIMEZONE,
): { isLate: boolean; lateMinutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(checkInDate);

  const checkInHour = parseInt(
    parts.find((p) => p.type === 'hour')?.value ?? '0',
    10,
  );
  const checkInMinute = parseInt(
    parts.find((p) => p.type === 'minute')?.value ?? '0',
    10,
  );

  const { hour: targetHour, minute: targetMinute } =
    parseTimeString(workStartTime);

  const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
  const targetTotalMinutes = targetHour * 60 + targetMinute;

  const diffMinutes = checkInTotalMinutes - targetTotalMinutes;

  if (diffMinutes <= lateToleranceMinutes) {
    return { isLate: false, lateMinutes: 0 };
  }

  return { isLate: true, lateMinutes: diffMinutes };
}

/**
 * Creates an ISO timestamp for work end time on a given date (YYYY-MM-DD)
 * using the configured work timezone (Asia/Jakarta, UTC+7).
 */
export function createWorkEndTimestamp(
  dateStr: string,
  workEndTime: string,
  timeZoneOffset = '+07:00',
): string {
  const timeWithSec =
    workEndTime.length === 5 ? `${workEndTime}:00` : workEndTime;
  return new Date(`${dateStr}T${timeWithSec}${timeZoneOffset}`).toISOString();
}
