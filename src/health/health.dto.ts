export class DatabaseHealthDto {
  /**
   * Database connection status (connected/disconnected)
   * @example connected
   */
  status!: string;

  /**
   * Database ping response time in milliseconds
   * @example 45
   */
  responseTimeMs!: number;
}

export class HealthResponseDto {
  /**
   * Overall system health status (ok/error)
   * @example ok
   */
  status!: string;

  /**
   * Current server ISO timestamp
   * @example 2026-10-10T17:58:00.000Z
   */
  timestamp!: string;

  /**
   * Process uptime in seconds
   * @example 120.45
   */
  uptimeSeconds!: number;

  /**
   * Database health status and metrics
   */
  database!: DatabaseHealthDto;
}
