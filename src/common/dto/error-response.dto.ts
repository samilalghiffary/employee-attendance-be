export class ErrorResponseDto {
  /**
   * HTTP status code
   * @example 400
   */
  statusCode!: number;

  /**
   * Error message or validation errors
   * @example "Validation failed: email must be an email"
   */
  message!: string | string[];

  /**
   * Error category or name
   * @example "Bad Request"
   */
  error?: string;

  /**
   * Error timestamp
   * @example "2026-10-10T17:58:00.000Z"
   */
  timestamp!: string;

  /**
   * Request path
   * @example "/api/auth/login"
   */
  path!: string;
}
