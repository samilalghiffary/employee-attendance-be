import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

export interface ApiDocOptions {
  summary: string;
  description?: string;
  responseType?: Type<unknown> | [Type<unknown>];
  status?: number;
  responseDescription?: string;
  isAuth?: boolean;
}

/**
 * Reusable Swagger Documentation decorator for standard API endpoints.
 * Automatically adds common response status codes (400, 401, 403, 500) with standard ErrorResponseDto.
 */
export function ApiDoc(options: ApiDocOptions) {
  const status = options.status ?? 200;
  const decorators: Array<MethodDecorator | ClassDecorator> = [
    ApiOperation({
      summary: options.summary,
      description: options.description ?? options.summary,
    }),
    ApiResponse({
      status,
      description: options.responseDescription ?? 'Operation successful',
      type: options.responseType,
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
      type: ErrorResponseDto,
    }),
  ];

  if (status === 201 || status === 200) {
    decorators.push(
      ApiBadRequestResponse({
        description: 'Validation failed or bad request input',
        type: ErrorResponseDto,
      }),
    );
  }

  if (options.isAuth) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: 'Unauthorized: missing or invalid authentication token',
        type: ErrorResponseDto,
      }),
      ApiForbiddenResponse({
        description: 'Forbidden: insufficient permissions for this resource',
        type: ErrorResponseDto,
      }),
    );
  }

  return applyDecorators(...decorators);
}
