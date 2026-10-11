import type { PaginatedResult } from '../dto/pagination.dto.js';

export function getPaginationParams(query: { page?: number; limit?: number }) {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 10;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

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
