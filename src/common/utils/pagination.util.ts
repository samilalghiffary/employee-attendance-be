import type { PaginatedResult } from '../dto/pagination.dto.js';

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : 10;
  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    success: true,
    data,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    },
  };
}
