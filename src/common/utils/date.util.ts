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
 * Checks whether the current time exceeds a given threshold hour and minute.
 */
export function isAfterThresholdTime(
  date = new Date(),
  thresholdHour = 9,
  thresholdMinute = 0,
  timeZone = DEFAULT_TIMEZONE,
): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(
    parts.find((p) => p.type === 'minute')?.value ?? '0',
    10,
  );

  if (hour > thresholdHour) return true;
  if (hour === thresholdHour && minute > thresholdMinute) return true;
  return false;
}
