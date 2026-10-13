import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  /**
   * Data page number (starting from 1)
   * @example 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /**
   * Number of items per page (maximum 100)
   * @example 10
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  /**
   * Field to sort by
   * @example date
   */
  @IsOptional()
  @IsString()
  sortBy?: string;

  /**
   * Sort direction: 'asc' or 'desc'
   * @example desc
   */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginationMetaDto {
  /**
   * Total number of matching records
   * @example 42
   */
  total!: number;

  /**
   * Current active page number
   * @example 1
   */
  page!: number;

  /**
   * Maximum item limit per page
   * @example 10
   */
  limit!: number;

  /**
   * Total number of available pages
   * @example 5
   */
  totalPages!: number;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  meta: PaginationMetaDto;
}
